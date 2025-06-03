import google.generativeai as genai
from .config_manager import get_config

def get_company_summary_from_ai(long_business_summary: str, model: str = "gemini-pro") -> str:
    """
    Uses Gemini (Google Generative AI) to generate a concise, structured company summary from a long business description.
    Args:
        long_business_summary (str): The raw longBusinessSummary from yfinance.
        model (str): The Gemini model to use (default: gemini-pro).
    Returns:
        str: AI-generated concise summary, or error message.
    """
    config = get_config()
    if not config.data_source.gemini_api_key:
        return "[AI Error: No Gemini API key configured.]"
    if not long_business_summary:
        return "[AI Error: No business summary provided.]"
    try:
        genai.configure(api_key=config.data_source.gemini_api_key)
        prompt = (
            "Summarize the following company description in 3-5 bullet points, "
            "focusing on what the company does, its main business lines, and any unique aspects. "
            "Be concise and use plain language.\n\n"
            f"Company Description: {long_business_summary}"
        )
        model_obj = genai.GenerativeModel(model)
        response = model_obj.generate_content(prompt)
        summary = response.text.strip()
        return summary
    except Exception as e:
        return f"[AI Error: {str(e)}]" 