# Custom RAG PDF Chatbot 🤖

A web application that allows users to upload PDF documents and chat with their content using AI.

## Features

- Upload PDF documents
- Extract text from PDFs
- Convert document text into embeddings
- Store embeddings using Chroma Vector Database
- Ask questions about uploaded documents
- Get AI-generated answers using Google Gemini
- React-based chat interface

## Tech Stack

### Frontend
- React.js
- Vite
- Tailwind CSS

### Backend
- Python
- FastAPI
- LangChain

### AI & Database
- Google Gemini AI
- Chroma Vector Database
- Embeddings

### Deployment
- Frontend: Vercel
- Backend: Render

## Live Demo

Frontend:
https://custom-rag-pdf-chatbot.vercel.app

Backend:
https://custom-rag-pdf-chatbot.onrender.com

## How It Works

1. User uploads a PDF.
2. Backend extracts text from the PDF.
3. Text is divided into smaller chunks.
4. Embeddings are created and stored.
5. User asks questions.
6. AI retrieves relevant information and generates answers.

## Author

Nipun Bansal
