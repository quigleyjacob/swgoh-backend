# 1. Use a lightweight Node base image
FROM node:22-slim

# 2. Install Python, pip, fontconfig, and fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    fontconfig \
    fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

# 3. Refresh the system font cache
RUN fc-cache -f -v

# 4. Set the working directory inside the container
WORKDIR /app

# 5. Install Python dependencies first (leverages Docker caching)
COPY requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# 6. Install Node dependencies
COPY package*.json ./
RUN npm ci

# 7. Copy the rest of your application files
COPY . .

# 8. Define the command to start your application
CMD ["npm", "start"]
