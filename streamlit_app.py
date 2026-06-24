import streamlit as st
import streamlit.components.v1 as components
import os

# 1. Page Configuration
st.set_page_config(
    page_title="ApexTrade - Stock Simulator",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# 2. Styling to remove Streamlit's default padding for full screen experience
st.markdown("""
    <style>
        .reportview-container {
            margin-top: -2em;
        }
        #MainMenu {visibility: hidden;}
        .stDeployButton {display:none;}
        footer {visibility: hidden;}
        #stDecoration {display:none;}
        div.block-container {
            padding-top: 0.5rem;
            padding-left: 0.5rem;
            padding-right: 0.5rem;
            padding-bottom: 0.5rem;
        }
    </style>
""", unsafe_allow_code=True)

# 3. Helper function to load HTML, CSS, JS and bundle them inline
def load_bundled_html():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Read index.html
    html_path = os.path.join(current_dir, "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()
        
    # Read index.css
    css_path = os.path.join(current_dir, "index.css")
    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()
        
    # Read app.js
    js_path = os.path.join(current_dir, "app.js")
    with open(js_path, "r", encoding="utf-8") as f:
        js = f.read()

    # Inject CSS inline
    html = html.replace(
        '<link rel="stylesheet" href="index.css">',
        f'<style>{css}</style>'
    )
    
    # Inject JS inline
    html = html.replace(
        '<script src="app.js"></script>',
        f'<script>{js}</script>'
    )
    
    return html

# 4. Render the application inside Streamlit iframe
try:
    bundled_html = load_bundled_html()
    # Serve component with full height
    components.html(bundled_html, height=950, scrolling=True)
except Exception as e:
    st.error(f"애플리케이션 파일을 불러오는 중 오류가 발생했습니다: {e}")
