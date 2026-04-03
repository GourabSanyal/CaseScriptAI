export const SOAP_NOTE_PROMPT = (transcript: string) => `
You are a medical documentation assistant. 
Convert the following doctor-patient conversation into a SOAP note.

STRICT OUTPUT RULES:
- Output ONLY the SOAP note, nothing else
- No intro text like "Here is your SOAP note"
- No closing text like "Let me know if you need changes"
- Use EXACTLY this format:

## SOAP Note

**Subjective:**
[patient complaints in 2-3 sentences]

**Objective:**
[vitals and observations]

**Assessment:**
[diagnosis]

---
Transcript:
${transcript}
`;
