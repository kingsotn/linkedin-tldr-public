from flask import Flask, request, jsonify
import hashlib
from openai import OpenAI
import os
from botocore.exceptions import ClientError
import boto3
from flask_cors import CORS


"""
resource for boto3
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/table/index.html
"""


# init flask
app = Flask(__name__)
CORS(app, resources={r"/summarize": {"origins": "https://www.linkedin.com/*"}})
# api_key = os.environ["OPENAI_API_KEY"]

# create client
dynamodb = boto3.resource("dynamodb", region_name="us-east-1")

# connect to table
table = dynamodb.Table("ExtensionDB")
# print("summary", table.table_class_summary)

# init openai client
client = OpenAI(api_key=app.config["OPENAI_API_KEY"])
_SUMMARIZE_LIMIT = 100


def check_authorization(extension_identifier):
    """Check if the request has the correct extension header."""
    return extension_identifier == "sanitized"


def validate_query_string(query_string):
    """Validate the query string."""
    if not isinstance(query_string, str) or not query_string.strip():
        return jsonify({"error": "Invalid query_string parameter"}), 400
    return None


def validate_request_body(request_body):
    """Validate the request body."""
    if not request_body:
        return jsonify({"error": "Invalid request body"}), 400
    return None


def get_client_id(profile_id, forwarded_addr):
    """Get the client ID from request headers or generate a new one from IP address."""
    client_id = request.headers.get("X-Client-ID")
    if not client_id:
        client_id = generate_client_id(profile_id, forwarded_addr)
        print("client_id:", client_id, "from", forwarded_addr)
    return client_id


def generate_client_id(profile_id: str, forwarded_addr: str):
    # client_id = hash(profile+ip)
    # Use SHA-256 hashing for generating a unique client ID
    # main reason for combining the profile_id and the ip is so that \\\mutliple users on the same ip can count as different users
    if not profile_id:
        profile_ip = forwarded_addr
    else:
        profile_ip = profile_id + forwarded_addr
    hash_object = hashlib.sha256(profile_ip.encode())
    return hash_object.hexdigest()


def fetch_and_update_client_data(profile_id, profile_url, forwarded_addr):
    """Fetch client data and update it if needed."""

    # returns the client_id from the table or creates a new one
    client_id = get_client_id(profile_id, forwarded_addr)

    try:
        # grab the client_id details from db
        response = table.get_item(Key={"client_id": client_id})
        item = response.get("Item")

        # create a new item in the db if not exist
        if item is None:
            print("No client data found, creating new entry.")
            # Initial value for summarize_count set to 0, will be incremented to 1
            response = table.put_item(Item={"sanitized"})
            new_count = 1  # Since we are creating the entry, start counting from 1
            return new_count, None  # Return new_count as 1 and no error

        # check summarize count
        summarize_count = item.get("summarize_count", 0)
        if summarize_count >= _SUMMARIZE_LIMIT:
            return None, "Summarize limit reached"

        # Update client data
        response = table.update_item("sanitized")
        return new_count, None  # new_count and no error

    except ClientError as e:
        print(e.response["Error"]["Message"])
        return None, "Server error: " + e.response["Error"]["Message"]


def gpt_request(query_string: str):
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {
                "role": "system",
                "sanitized": "sanitized",
            },
            {"role": "user", "content": query_string},
        ],
        temperature=1.05,
        top_p=1,
        frequency_penalty=0.5,
        presence_penalty=0,
    )

    response_text = response.choices[0].message.content

    # remove "" from the ends
    if response_text[0] == '"' and response_text[-1] == '"':
        response_text = response_text[1:-1]

    return response_text


@app.route("/")
def index():
    return "Application is running!", 200


@app.route("/health_check", methods=["POST"])
def health_check():
    print("health check")
    return "HealthCheck is running!", 200


@app.route("/summarize", methods=["POST"])
def summarize_text():
    # check_authorization

    # validate_request_body
    request_body = request.get_json()
    print(request.headers)
    validation_error = validate_request_body(request_body)
    if validation_error:
        return validation_error

    # validate_query_string
    query_string = request_body.get("query_string")
    query_string_error = validate_query_string(query_string)
    if query_string_error:
        return query_string_error

    # validate_profile_info_string
    profile_info = request_body.get("profile_info")
    if not profile_info or not isinstance(profile_info, dict):
        return jsonify({"error": "Invalid profile_info in request body"}), 400
    profile_url = profile_info.get("profile_url")
    profile_id = profile_info.get("profile_id")
    if not profile_url:
        return (
            jsonify({"error": "Missing or invalid 'profile_url' in request body"}),
            400,
        )
    if not profile_id:
        return (
            jsonify({"error": "Missing or invalid 'profile_id' in request body"}),
            400,
        )

    # fetch_and_update_client_data

    new_count, error = fetch_and_update_client_data(
        profile_id, profile_url, request.headers.get("X-Forwarded-For")
    )
    if error:
        return jsonify({"error": error}), 500 if "Server error" in error else 429

    # !!mock response
    # summary_response = "This is a simulated summary for query: {}".format(query_string)

    # !!real response

    summary_response = gpt_request(query_string)

    response = jsonify(
        {
            "summary": summary_response,
            "summarize_count": new_count,
        }
    )

    # response.headers["Access-Control-Allow-Origin"] = "https://www.linkedin.com"
    return response


if __name__ == "__main__":

    app.run(host="0.0.0.0", debug=True)
