# tools.py
"""
Backend processing logic for the Streamlit AI Document Analyzer.
Handles file reading (text, markdown, pdf) and orchestrates Gemini API calls.
"""

import os
from typing import Optional
import google.generativeai as genai
from pypdf import PdfReader

# Configure the Gemini API client using the environment variable
def init_gemini() -> bool:
    """
    Initializes the google-generativeai client using GEMINI_API_KEY from environment.
    Returns True if successful, False otherwise.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return False
    genai.configure(api_key=api_key)
    return True

def extract_text_from_file(file) -> str:
    """
    Extracts text contents from uploaded files.
    Supports .txt, .md, and .pdf files.
    """
    file_name = file.name.lower()
    
    if file_name.endswith(('.txt', '.md')):
        # For plain text and markdown
        try:
            return file.read().decode("utf-8")
        except UnicodeDecodeError:
            try:
                # Fallback to latin-1
                return file.read().decode("latin-1")
            except Exception as e:
                raise ValueError(f"Error reading text file: {str(e)}")
                
    elif file_name.endswith('.pdf'):
        # Extract text from PDF using pypdf
        try:
            pdf_reader = PdfReader(file)
            extracted_text = []
            for i, page in enumerate(pdf_reader.pages):
                page_text = page.extract_text()
                if page_text:
                    extracted_text.append(f"--- PAGE {i + 1} ---\n{page_text}")
            
            if not extracted_text:
                raise ValueError("Could not extract any text from the PDF. It might be scanned or image-only.")
                
            return "\n\n".join(extracted_text)
        except Exception as e:
            raise ValueError(f"Error processing PDF: {str(e)}")
            
    else:
        raise ValueError("Unsupported file format. Please upload .txt, .md, or .pdf files.")

def analyze_document(
    document_content: str,
    system_prompt: str,
    user_prompt: str,
    model_name: str = "gemini-2.5-flash",
    temperature: float = 0.2
) -> str:
    """
    Calls the Gemini API to analyze the document text with the specified prompt and configs.
    """
    # Verify client initialization
    if not init_gemini():
        raise RuntimeError(
            "GEMINI_API_KEY environment variable not configured. "
            "Please check your .env file or Streamlit Cloud Secrets settings."
        )
        
    try:
        # Load the specified model with the system instruction
        model = genai.GenerativeModel(
            model_name=model_name,
            generation_config={"temperature": temperature},
            system_instruction=system_prompt
        )
        
        # Call generate_content
        response = model.generate_content(user_prompt)
        
        if not response or not response.text:
            raise RuntimeError("Received an empty response from Gemini. Please check your inputs or try again.")
            
        return response.text
        
    except Exception as e:
        # Provide clean, professional error reporting
        error_msg = str(e)
        if "API_KEY_INVALID" in error_msg or "API key not valid" in error_msg:
            raise RuntimeError("The provided Gemini API Key is invalid. Please double-check your credentials.")
        elif "quota" in error_msg.lower() or "limit" in error_msg.lower():
            raise RuntimeError("API quota or rate limit exceeded. Please wait a moment and try again.")
        else:
            raise RuntimeError(f"Gemini API Error: {error_msg}")
