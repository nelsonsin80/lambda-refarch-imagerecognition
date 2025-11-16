// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

import Amplify from "aws-amplify";
import awsExports from "./aws-exports";
import * as serviceWorker from "./serviceWorker";

// Configure Amplify once, before rendering any components
Amplify.configure(awsExports);

const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service worker: keep unregistered (default CRA behaviour)
serviceWorker.unregister();
