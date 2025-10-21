@echo off
echo ========================================
echo Installing HuggingFace Hub for Fast PDF Extraction
echo ========================================
echo.

echo Installing huggingface-hub package...
pip install huggingface-hub

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Get free API key: https://huggingface.co/settings/tokens
echo 2. Add to .env file: HUGGINGFACE_API_KEY=hf_your_token
echo 3. Restart: python app.py
echo 4. Upload PDF - see 10x speed improvement!
echo.
pause
