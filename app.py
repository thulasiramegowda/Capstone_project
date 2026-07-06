# app.py
"""
AI Document Analyzer - Streamlit UI
A premium, dark-themed split-screen application for processing files and text with Gemini.
"""

import streamlit as st
import os
from dotenv import load_dotenv

# Load local environment variables from .env if present
load_dotenv()

# Import our modular backend utilities
from tools import extract_text_from_file, analyze_document, init_gemini
from prompts import get_system_prompt, format_user_prompt

# ----------------- PAGE CONFIGURATION -----------------
st.set_page_config(
    page_title="AI Document Analyzer",
    page_icon="📄",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ----------------- CUSTOM STYLING (DARK THEME) -----------------
# We inject professional CSS to style the app with slate/dark aesthetics,
# clean typography, custom cards, and robust margins.
st.markdown("""
<style>
    /* Dark Theme Core Styles */
    .stApp {
        background-color: #0f172a; /* Tailwind slate-900 */
        color: #f1f5f9; /* Tailwind slate-100 */
    }
    
    /* Sidebar styling */
    section[data-testid="stSidebar"] {
        background-color: #1e293b !important; /* Tailwind slate-800 */
        border-right: 1px solid #334155;
    }
    
    /* Header/Typography overrides */
    h1, h2, h3, h4, h5, h6 {
        color: #f8fafc !important;
        font-family: 'Inter', system-ui, sans-serif;
        font-weight: 600 !important;
        letter-spacing: -0.025em;
    }
    
    /* Cards and Containers */
    .custom-card {
        background-color: #1e293b;
        padding: 1.5rem;
        border-radius: 0.75rem;
        border: 1px solid #334155;
        margin-bottom: 1.5rem;
    }
    
    .scroll-container {
        background-color: #1e293b;
        border: 1px solid #334155;
        border-radius: 0.5rem;
        padding: 1.25rem;
        max-height: 500px;
        overflow-y: auto;
        font-family: 'Inter', sans-serif;
        line-height: 1.6;
        color: #e2e8f0;
    }
    
    /* Success/Info Alerts styling */
    div[data-testid="stAlert"] {
        background-color: #1e293b;
        border: 1px solid #334155;
        color: #f1f5f9;
    }
    
    /* Custom divider line */
    .divider {
        height: 1px;
        background-color: #334155;
        margin: 1.5rem 0;
    }
</style>
""", unsafe_allow_html=True)

# Initialize Session State to store output results across runs
if "analysis_output" not in st.session_state:
    st.session_state.analysis_output = ""
if "processed_doc_name" not in st.session_state:
    st.session_state.processed_doc_name = ""

# Check Gemini connection on startup
has_api_key = init_gemini()

# ----------------- SIDEBAR CONFIGURATION -----------------
with st.sidebar:
    st.markdown("### 🛠️ Model Controls")
    
    # Model Selection
    model_choice = st.selectbox(
        "Select Gemini Model",
        options=["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash"],
        index=0,
        help="gemini-2.5-flash is fast and perfect for standard tasks. Use gemini-2.5-pro for complex coding, math, or translation."
    )
    
    # Temperature
    temperature_slider = st.slider(
        "Temperature / Creativity",
        min_value=0.0,
        max_value=1.0,
        value=0.2,
        step=0.05,
        help="Lower values make the output more analytical and precise. Higher values make it more creative."
    )
    
    st.markdown("<div class='divider'></div>", unsafe_allow_html=True)
    st.markdown("### 📋 Analysis Task")
    
    # Selected Task
    task_type = st.selectbox(
        "Select Analytical Mode",
        options=["Summarize", "Q&A", "Technical Review", "Refine & Polish"],
        index=0,
        help="Select how Gemini should analyze your text."
    )
    
    st.markdown("<div class='divider'></div>", unsafe_allow_html=True)
    
    # API Status Check Display
    st.markdown("### 🔐 API Authentication Status")
    if has_api_key:
        st.success("Connected to Gemini API")
    else:
        st.warning("Missing GEMINI_API_KEY")
        st.markdown(
            "Please create a `.env` file containing `GEMINI_API_KEY='your_key'` "
            "locally or add it to Streamlit Cloud Secrets."
        )

# ----------------- MAIN SPLIT-SCREEN AREA -----------------
st.title("📄 Streamlit AI Document Analyzer")
st.markdown("A professional dual-pane dashboard for deep document analysis powered by Google Gemini.")
st.markdown("<div class='divider'></div>", unsafe_allow_html=True)

# Split screen Columns: Left side Input, Right side Output
col_input, col_output = st.columns([1, 1], gap="large")

# --- LEFT COLUMN: CONTENT INPUT ---
with col_input:
    st.markdown("### 📥 Document & Text Input")
    
    # File Uploader
    uploaded_file = st.file_uploader(
        "Upload Document (.md, .txt, .pdf)",
        type=["md", "txt", "pdf"],
        help="Supports raw text files, Markdown files, and PDF documents."
    )
    
    # Text Area for manual text
    manual_text = st.text_area(
        "Or paste your content directly here:",
        height=250,
        placeholder="Type, paste, or upload content above to begin the analysis..."
    )
    
    # Dynamic Q&A field (Only displays when Q&A is selected)
    user_query = ""
    if task_type == "Q&A":
        st.markdown("<div class='divider'></div>", unsafe_allow_html=True)
        user_query = st.text_input(
            "❓ Enter your question about the document:",
            placeholder="e.g., What are the main action items? Who is the author?"
        )
        
    st.markdown("<div class='divider'></div>", unsafe_allow_html=True)
    
    # Run Button
    analyze_btn = st.button("🚀 Run AI Analysis", use_container_width=True)

# --- RIGHT COLUMN: AGENT OUTPUT ---
with col_output:
    st.markdown("### 🤖 Agent Analysis Output")
    
    # Action triggers when the button is clicked
    if analyze_btn:
        document_text = ""
        doc_source_name = ""
        
        # Determine content source
        if uploaded_file is not None:
            doc_source_name = uploaded_file.name
            with st.spinner("Parsing document content..."):
                try:
                    document_text = extract_text_from_file(uploaded_file)
                except Exception as e:
                    st.error(f"Failed to read file: {str(e)}")
        elif manual_text.strip():
            document_text = manual_text.strip()
            doc_source_name = "Direct Text Input"
        else:
            st.error("Please upload a file or paste text content before analyzing.")
            
        # Proceed with analysis if text is loaded
        if document_text:
            if task_type == "Q&A" and not user_query.strip():
                st.warning("Please enter a question to run Q&A mode.")
            else:
                # Retrieve specific system prompt
                sys_prompt = get_system_prompt(task_type)
                
                # Format payload for Gemini
                user_payload = format_user_prompt(document_text, user_query if task_type == "Q&A" else None)
                
                # Run the actual request
                with st.spinner("Analyzing document with Gemini..."):
                    try:
                        result = analyze_document(
                            document_content=document_text,
                            system_prompt=sys_prompt,
                            user_prompt=user_payload,
                            model_name=model_choice,
                            temperature=temperature_slider
                        )
                        
                        # Store in session state for persistence
                        st.session_state.analysis_output = result
                        st.session_state.processed_doc_name = doc_source_name
                        
                    except Exception as e:
                        st.error(str(e))

    # Display the result in a scrollable card container
    if st.session_state.analysis_output:
        st.info(f"Analysis complete for: **{st.session_state.processed_doc_name}**")
        
        # Main text output rendered in markdown inside a clean scrollable box
        st.markdown(
            f"<div class='scroll-container'>{st.session_state.analysis_output}</div>",
            unsafe_allow_html=True
        )
        
        st.markdown("<div style='height: 1rem;'></div>", unsafe_allow_html=True)
        
        # Download and Copy action items
        col_down, col_info = st.columns([1, 2])
        with col_down:
            st.download_button(
                label="📥 Download Report (.md)",
                data=st.session_state.analysis_output,
                file_name=f"gemini_analysis_{task_type.lower().replace(' ', '_')}.md",
                mime="text/markdown",
                use_container_width=True
            )
        with col_info:
            st.caption("💡 Copy-paste the text directly from the container above or download the markdown report.")
    else:
        # Prompt when there is no analysis output yet
        st.markdown(
            "<div style='border: 1px dashed #334155; border-radius: 0.5rem; padding: 3rem; text-align: center; color: #64748b;'>"
            "<h3>Awaiting Input</h3>"
            "<p>Upload a file or paste content and click 'Run AI Analysis' on the left panel to see the results here.</p>"
            "</div>",
            unsafe_allow_html=True
        )
