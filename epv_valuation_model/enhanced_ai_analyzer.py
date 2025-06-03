"""
Enhanced AI Analyzer Module for EPV Valuation Model
Provides advanced AI-powered analysis with configurable prompts and structured output.
"""

import json
import re
from typing import Dict, List, Any, Optional, Union
import google.generativeai as genai

try:
    from .config_manager import get_config
    from .logging_config import get_ai_analyzer_logger
except ImportError:
    # Handle case when module is run directly
    from config_manager import get_config
    from logging_config import get_ai_analyzer_logger

class AIAnalyzer:
    """Enhanced AI analyzer with configurable prompts and structured output."""
    
    def __init__(self):
        self.config = get_config()
        self.logger = get_ai_analyzer_logger()
        self._setup_ai()
        
        # Configurable prompts
        self.prompts = {
            'company_summary': {
                'system': "You are a financial analyst specializing in company analysis.",
                'user_template': """Analyze the following company description and provide a structured summary.

Company Description: {business_summary}

Please provide your analysis in the following JSON format:
{{
    "business_model": "Brief description of how the company makes money",
    "key_segments": ["List", "of", "main", "business", "segments"],
    "competitive_advantages": ["List", "of", "key", "competitive", "advantages"],
    "risk_factors": ["List", "of", "main", "risk", "factors"],
    "industry_classification": "Primary industry classification",
    "summary_bullets": ["3-5", "bullet", "points", "summarizing", "the", "company"]
}}

Ensure the response is valid JSON only, no additional text."""
            },
            'financial_data_analysis': {
                'system': "You are a financial data analyst with expertise in financial statement analysis.",
                'user_template': """Analyze the following financial data and provide insights.

Financial Data:
{financial_data}

Provide analysis in JSON format:
{{
    "revenue_trend": "Description of revenue trend",
    "profitability_analysis": "Analysis of profitability metrics",
    "growth_indicators": ["Key", "growth", "indicators"],
    "financial_health": "Overall financial health assessment",
    "red_flags": ["Any", "concerning", "financial", "indicators"],
    "strengths": ["Financial", "strengths", "identified"]
}}"""
            },
            'industry_context': {
                'system': "You are an industry analyst with deep knowledge of various sectors.",
                'user_template': """Provide industry context for the following company in {industry} sector.

Company: {company_name}
Industry: {industry}

Provide analysis in JSON format:
{{
    "industry_outlook": "Current industry outlook and trends",
    "competitive_landscape": "Description of competitive environment",
    "regulatory_environment": "Key regulatory considerations",
    "cyclical_factors": "Industry cyclical characteristics",
    "valuation_considerations": ["Industry-specific", "valuation", "factors"],
    "peer_comparison_factors": ["Factors", "for", "peer", "comparison"]
}}"""
            }
        }
    
    def _setup_ai(self):
        """Setup AI configuration."""
        if not self.config.data_source.gemini_api_key:
            self.logger.warning("No Gemini API key configured - AI features will be limited")
            self.ai_available = False
            return
        
        try:
            genai.configure(api_key=self.config.data_source.gemini_api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash-latest')
            self.ai_available = True
            self.logger.info("AI analyzer initialized successfully")
        except Exception as e:
            self.logger.error(f"Failed to initialize AI: {e}")
            self.ai_available = False
    
    def get_company_summary(self, business_summary: str, return_json: bool = True) -> Union[Dict, str]:
        """
        Generate enhanced company summary with structured output.
        
        Args:
            business_summary: Raw business description
            return_json: Whether to return structured JSON or plain text
            
        Returns:
            Structured analysis dict or plain text summary
        """
        if not self.ai_available:
            return self._fallback_company_summary(business_summary, return_json)
        
        if not business_summary:
            return {"error": "No business summary provided"} if return_json else "[Error: No business summary provided]"
        
        try:
            prompt = self.prompts['company_summary']['user_template'].format(
                business_summary=business_summary
            )
            
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            if return_json:
                return self._parse_json_response(response_text, 'company_summary')
            else:
                # Convert JSON to readable text
                try:
                    data = json.loads(response_text)
                    return self._format_company_summary_text(data)
                except:
                    return response_text
                    
        except Exception as e:
            self.logger.error(f"AI company summary failed: {e}")
            return self._fallback_company_summary(business_summary, return_json)
    
    def analyze_financial_data(self, financial_data: Dict) -> Dict[str, Any]:
        """
        Analyze financial data using AI.
        
        Args:
            financial_data: Dictionary containing financial metrics
            
        Returns:
            Structured financial analysis
        """
        if not self.ai_available:
            return {"error": "AI not available", "analysis": "Basic financial data provided"}
        
        try:
            # Format financial data for AI analysis
            formatted_data = self._format_financial_data_for_ai(financial_data)
            
            prompt = self.prompts['financial_data_analysis']['user_template'].format(
                financial_data=formatted_data
            )
            
            response = self.model.generate_content(prompt)
            return self._parse_json_response(response.text.strip(), 'financial_analysis')
            
        except Exception as e:
            self.logger.error(f"AI financial analysis failed: {e}")
            return {"error": f"Analysis failed: {e}"}
    
    def get_industry_context(self, company_name: str, industry: str) -> Dict[str, Any]:
        """
        Get industry-specific context and analysis.
        
        Args:
            company_name: Name of the company
            industry: Industry classification
            
        Returns:
            Industry context analysis
        """
        if not self.ai_available:
            return {"error": "AI not available"}
        
        try:
            prompt = self.prompts['industry_context']['user_template'].format(
                company_name=company_name,
                industry=industry
            )
            
            response = self.model.generate_content(prompt)
            return self._parse_json_response(response.text.strip(), 'industry_context')
            
        except Exception as e:
            self.logger.error(f"AI industry analysis failed: {e}")
            return {"error": f"Industry analysis failed: {e}"}
    
    def _parse_json_response(self, response_text: str, analysis_type: str) -> Dict[str, Any]:
        """Parse JSON response from AI with error handling."""
        try:
            # Try to extract JSON from response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                return json.loads(json_str)
            else:
                # If no JSON found, try parsing the whole response
                return json.loads(response_text)
                
        except json.JSONDecodeError as e:
            self.logger.warning(f"Failed to parse JSON response for {analysis_type}: {e}")
            return {
                "error": "Failed to parse AI response",
                "raw_response": response_text,
                "analysis_type": analysis_type
            }
    
    def _format_financial_data_for_ai(self, financial_data: Dict) -> str:
        """Format financial data for AI analysis."""
        formatted_lines = []
        
        for key, value in financial_data.items():
            if isinstance(value, (int, float)):
                if abs(value) > 1e9:
                    formatted_lines.append(f"{key}: ${value/1e9:.2f}B")
                elif abs(value) > 1e6:
                    formatted_lines.append(f"{key}: ${value/1e6:.2f}M")
                else:
                    formatted_lines.append(f"{key}: ${value:,.2f}")
            else:
                formatted_lines.append(f"{key}: {value}")
        
        return "\n".join(formatted_lines)
    
    def _format_company_summary_text(self, data: Dict) -> str:
        """Convert structured company data to readable text."""
        lines = []
        
        if 'business_model' in data:
            lines.append(f"Business Model: {data['business_model']}")
        
        if 'key_segments' in data and data['key_segments']:
            lines.append(f"Key Business Segments: {', '.join(data['key_segments'])}")
        
        if 'competitive_advantages' in data and data['competitive_advantages']:
            lines.append("Competitive Advantages:")
            for advantage in data['competitive_advantages']:
                lines.append(f"  • {advantage}")
        
        if 'summary_bullets' in data and data['summary_bullets']:
            lines.append("Summary:")
            for bullet in data['summary_bullets']:
                lines.append(f"  • {bullet}")
        
        return "\n".join(lines)
    
    def _fallback_company_summary(self, business_summary: str, return_json: bool) -> Union[Dict, str]:
        """Fallback company summary when AI is not available."""
        if return_json:
            return {
                "business_model": "AI analysis not available",
                "summary_bullets": ["Company analysis requires AI features"],
                "note": "Limited analysis - AI not configured"
            }
        else:
            return "[AI analysis not available - please configure Gemini API key for enhanced features]"
    
    def update_prompt(self, prompt_type: str, system: str = None, user_template: str = None):
        """Update configurable prompts."""
        if prompt_type not in self.prompts:
            raise ValueError(f"Unknown prompt type: {prompt_type}")
        
        if system:
            self.prompts[prompt_type]['system'] = system
        if user_template:
            self.prompts[prompt_type]['user_template'] = user_template
        
        self.logger.info(f"Updated prompt configuration for {prompt_type}")

# Convenience functions for backward compatibility
def get_company_summary_from_ai(long_business_summary: str, model: str = "gemini-pro") -> str:
    """
    Legacy function for backward compatibility.
    Uses enhanced AI analyzer but returns simple text format.
    """
    analyzer = AIAnalyzer()
    return analyzer.get_company_summary(long_business_summary, return_json=False)

# Global analyzer instance
_analyzer_instance = None

def get_ai_analyzer() -> AIAnalyzer:
    """Get global AI analyzer instance."""
    global _analyzer_instance
    if _analyzer_instance is None:
        _analyzer_instance = AIAnalyzer()
    return _analyzer_instance

if __name__ == "__main__":
    # Test the enhanced AI analyzer
    analyzer = AIAnalyzer()
    test_summary = "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide."
    result = analyzer.get_company_summary(test_summary)
    print("AI Analyzer test result:", result) 