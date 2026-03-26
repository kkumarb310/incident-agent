from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

# Load once at startup — these are heavy objects
analyzer  = AnalyzerEngine()
anonymizer = AnonymizerEngine()

def mask_pii(text: str) -> str:
    """
    Detects and masks PII in text.
    Replaces with placeholder like <EMAIL_ADDRESS>, <IP_ADDRESS>
    """
    results = analyzer.analyze(text=text, language="en")

    if not results:
        return text  # nothing to mask

    masked = anonymizer.anonymize(text=text, analyzer_results=results)
    return masked.text


# Test it directly
if __name__ == "__main__":
    test = "User john.doe@company.com reported issue from IP 192.168.1.45 at 10:30am"
    print("Original:", test)
    print("Masked:  ", mask_pii(test))