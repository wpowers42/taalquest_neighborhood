# Project Memory

## Directory Layout

```
taalquest_neighborhood/
├── index.html        # Main HTML entry point
├── app.js            # Frontend application logic
├── api.js            # OpenAI API call functions
├── constants.js      # Configuration and constants
├── styles.css        # Styling
├── test_scenario.js  # Test script for scenario generation
└── package.json      # Package configuration
```

## OpenAI API

List available models:
```bash
curl -s https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY" | jq -r '.data[].id' | sort
```
