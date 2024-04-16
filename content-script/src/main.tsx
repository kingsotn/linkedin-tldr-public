
// main.tsx

// import ReactDOM from 'react-dom';
// import App from './App';


// function insertSummarizeComponent(appendArea: Element | null) {
//   if (!appendArea) {
//     console.error(">>insertSummarizeComponent(), appendArea not found");
//     return;
//   }

//   const summarizeContainer = document.createElement('div');
//   summarizeContainer.className = 'summarize-component-container'; // Optional: for styling
//   appendArea.appendChild(summarizeContainer);
//   ReactDOM.render(<App insertSummarizeComponent={insertSummarizeComponent} />, summarizeContainer);
// }

// ReactDOM.render(<App insertSummarizeComponent={insertSummarizeComponent} />, document.getElementById('root'));




// function insertSummarizeComponent(appendArea: Element | null) {
//   if (!appendArea) {
//     console.error(">>insertSummarizeComponent(), appendArea not found")
//     return
//   }

//   // Create a new div container for the summarize component
//   const summarizeContainer = document.createElement('div');
//   summarizeContainer.className = 'summarize-component-container'; // Optional: for styling

//   // Append the container to the specified append area
//   appendArea.appendChild(summarizeContainer);

//   // Render the SummarizeComponent into the new container
//   ReactDOM.render(<App />, summarizeContainer);
// }


import React from "react";
import { createRoot } from "react-dom/client";
import "./main.css";
import App from "./App";
// import { Theme } from "@radix-ui/themes";


// Assuming you still create the div element for your app and set its ID to 'root'
const app = document.createElement("div");
app.id = "root";

// Function to append the app to the body and initialize React
function initializeReactApp() {
  const body = document.querySelector("body");
  if (body) {
    // Using append here, but you can adjust based on your needs
    body.append(app);

    // Initialize React
    const container = document.getElementById("root");
    if (container) {
      const root = createRoot(container);
      console.log("Starting app");
      root.render(
        <React.StrictMode>
          {/* <Theme> */}

          <App />
          {/* </Theme> */}
        </React.StrictMode>
      );
    }
  }
}

// Example condition/event to start your app. Adjust this based on your requirements.
initializeReactApp();
