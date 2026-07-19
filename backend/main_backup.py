from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_chroma import Chroma
import os

app = FastAPI()


class QuestionRequest(BaseModel):
    question: str


# Allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

embedding_model = OllamaEmbeddings(
    model="nomic-embed-text"
)

llm = ChatOllama(
    model="llama3.2"
)


@app.get("/")
def home():
    return {"message": "Backend is working!"}


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    reader = PdfReader(file_path)
    total_pages = len(reader.pages)

    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )

    chunks = text_splitter.split_text(text)

    print("Total Chunks:", len(chunks))

    Chroma.from_texts(
        texts=chunks,
        embedding=embedding_model,
        persist_directory="db"
    )

    print("Embeddings stored successfully!")

    return {
        "message": "PDF uploaded successfully!",
        "filename": file.filename,
        "pages": total_pages,
        "text": text[:500]
    }


@app.post("/ask")
async def ask_question(request: QuestionRequest):

    vector_store = Chroma(
        persist_directory="db",
        embedding_function=embedding_model
    )

    retriever = vector_store.as_retriever(
        search_kwargs={"k": 1}
    )

    docs = retriever.invoke(request.question)

    context = "\n\n".join([doc.page_content for doc in docs])

    prompt = f"""
You are a helpful AI assistant.

Answer ONLY using the information provided below.

Context:
{context}

Question:
{request.question}

Answer:
"""

    response = llm.invoke(prompt)

    return {
        "question": request.question,
        "answer": response.content,
        "sources": [doc.page_content for doc in docs]
    }