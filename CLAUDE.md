# Project Memory

## OpenAI API

List available models:
```bash
curl -s https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY" | jq -r '.data[].id' | sort
```
