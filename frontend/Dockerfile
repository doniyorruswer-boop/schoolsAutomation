# ==============================================================
# EduMaktab AI - Frontend Dockerfile (Node.js 20 + Vite React)
# ==============================================================
FROM node:20-alpine

WORKDIR /app

# Paketlarni keshdan tezroq o'rnatish
COPY package*.json ./
RUN npm install

# Frontend kodlarini nusxalash
COPY . .

# Vite PWA porti
EXPOSE 3000

# Serverni tashqi ulanishlar uchun ishga tushirish
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
