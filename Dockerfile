FROM node:20

# Install python3, pip, and ffmpeg
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp via pip3 (using --break-system-packages if node:18 uses Debian 12 bookworm)
RUN pip3 install --no-cache-dir yt-dlp || pip3 install --no-cache-dir --break-system-packages yt-dlp

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install npm dependencies
RUN npm install

# Copy the rest of the project
COPY . .

# Build the Next.js app
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
