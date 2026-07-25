from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv 
from langchain_chroma import Chroma
import os
import shutil

load_dotenv()

#print("GOOGLE_API_KEY:", os.getenv("GOOGLE_API_KEY"))

app = FastAPI()


class QuestionRequest(BaseModel):
    question: str


# Allow React frontendpip show google-genai
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

embeddings = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-001",
    google_api_key=os.getenv("GOOGLE_API_KEY")
)

llm = ChatGoogleGenerativeAI(
    model="gemini-flash-latest",
    google_api_key=os.getenv("GOOGLE_API_KEY")
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
        text += (page.extract_text() or "") + "\n"

    text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50
)

    chunks = []

    for page_number, page in enumerate(reader.pages, start=1):
        page_text = page.extract_text() or ""

        page_chunks = text_splitter.split_text(page_text)

        for chunk in page_chunks:
            chunks.append({
                "page": page_number,
                "text": chunk
            })

    print("Total Chunks:", len(chunks))

    for i, chunk in enumerate(chunks):
        print(f"\n====== Chunk {i+1} ======")
        print(chunk)

    if os.path.exists("db"):
        try:
            shutil.rmtree("db")
        except PermissionError:
            pass
        
    Chroma.from_texts(
        texts=[chunk["text"] for chunk in chunks],
        metadatas=[{"page": chunk["page"]} for chunk in chunks],
        embedding=embeddings,
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
        embedding_function=embeddings
    )

    retriever = vector_store.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": 4,
            "fetch_k": 10
        }
    )

    docs = retriever.invoke(request.question)

    print("---------------")
    for i, doc in enumerate(docs):
        print(f"Chunk {i+1}:")
        print(doc.page_content)
        print("---------------")

    context = "\n\n".join([doc.page_content for doc in docs])

    prompt = f"""
You are an AI assistant.

Use ONLY the given context.

Answer naturally and briefly.

Do not write:
"Based on the provided context..."

Just give the answer directly.

Context:
{context}

Question:
{request.question}
"""

    response = llm.invoke(prompt)

    print(type(response.content))
    print(response.content)

    answer = response.content

    if isinstance(answer, list):
        answer = ""

        for item in response.content:
            print(type(item))
            print(item)

            if hasattr(item, "text"):
                answer += item.text
            elif isinstance(item, dict):
                answer += item.get("text", "")

    return {
        "question": request.question,
        "answer": answer,
        "sources": [doc.page_content for doc in docs]
    }