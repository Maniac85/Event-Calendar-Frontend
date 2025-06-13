# Stage 1: Build the Vue application
FROM node:22-alpine AS build-stage
LABEL authors="schlingel"

# Set the working directory
WORKDIR /app

# Deklariere VITE_APP_API_BASE_URL als Build-Argument
ARG VITE_APP_API_BASE_URL

# Setze VITE_APP_API_BASE_URL als Umgebungsvariable für den Build-Stage
# Dadurch ist sie während 'npm run build' verfügbar
ENV VITE_APP_API_BASE_URL=${VITE_APP_API_BASE_URL}

# Copy package.json and package-lock.json (or yarn.lock if you use yarn)
# This allows caching of dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application for production
RUN npm run build

# Stage 2: Serve the application with a lightweight web server (e.g., Nginx)
FROM nginx:alpine AS production-stage

# Copy the built application from the build-stage to Nginx's public directory
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Expose port 80 (standard HTTP port for web servers)
EXPOSE 80

# Command to run Nginx
CMD ["nginx", "-g", "daemon off;"]