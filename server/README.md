# GET STARTED

https://testdriven.io/blog/flask-elastic-beanstalk/

note that gunicorn Procfile on aws defaults to hosting on port 8000
web: gunicorn --bind 127.0.0.1:8000 --workers=1 --threads=15 app:app

1. Run the server
- -w is number of workers
- app1:app2 app1 is name of file, app2 is name of Flask app
- only for dev and test curling (since it hosts an http)
```sh
gunicorn -w 1 app:app
```

1. Run some test curls
```sh
python test.py
```


1. install and configure aws beanstalk cli
```sh

# init
eb init # follow install rules
eb create # same here

# to view shit
eb logs 

# to redeploy code
cd server
eb deploy

# fix on the server
eb ssh
source /var/app/venv/staging-LQM1lest/bin/activate
cd /var/app/current
ls -al