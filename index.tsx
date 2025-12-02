
/**
 * CANTEEN CREDIT MANAGER - APPLICATION ENTRY
 * ==========================================
 * 
 * [DOCKER DEPLOYMENT DOCUMENTATION]
 * 
 * This application is architected to be deployed as a containerized static web app.
 * To deploy, create a 'Dockerfile' in the project root with the content below.
 * 
 * --- BEGIN DOCKERFILE ---
 * # Stage 1: Build the React Application
 * FROM node:18-alpine as build
 * WORKDIR /app
 * COPY package*.json ./
 * RUN npm ci
 * COPY . .
 * RUN npm run build
 * 
 * # Stage 2: Serve with Nginx
 * FROM nginx:alpine
 * COPY --from=build /app/dist /usr/share/nginx/html
 * # Optional: COPY nginx.conf /etc/nginx/conf.d/default.conf
 * EXPOSE 80
 * CMD ["nginx", "-g", "daemon off;"]
 * --- END DOCKERFILE ---
 * 
 * [COMMANDS]
 * 1. Build Image:  docker build -t canteen-manager:latest .
 * 2. Run Container: docker run -d -p 8080:80 --name canteen-v1 canteen-manager:latest
 * 3. Access:       http://localhost:8080
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
