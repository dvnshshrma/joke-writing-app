FROM node:22-slim

WORKDIR /app

# Install ffmpeg (required for video compression)
RUN apt-get update -y && apt-get install -y ffmpeg

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3001
CMD ["node", "server-supabase.js"]
