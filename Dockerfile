
# Use the official Node.js image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install create-next-app globally
RUN npm install -g create-next-app@latest

# Create Next.js app
RUN create-next-app . --ts --eslint --app --src-dir --use-npm --no-install --yes

# Copy local files (overwriting generated files)
COPY . .

# Install dependencies
RUN npm install

# Build the Next.js app
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start the Next.js application
CMD ["npm", "start"]
