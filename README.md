# transcriptor

### Prerequisite on your Gmail
- Create labels named `#GAS/transcriptor-enq` and `#GAS/transcriptor-deq`
- Create a filter which labels `#GAS/transcriptor-enq` to target emails

### Prerequisite on your Google Cloud console
- Enable "Cloud Speech API" at https://console.cloud.google.com/apis/library/speech.googleapis.com/
- Create an API key at https://console.cloud.google.com/apis/credentials

### Usage
- Add new GAS from https://script.google.com/home
- Place `transcriptor.js` as `Code.gs`
- Set up values below:
  - `GC_API_KEY`
  - `RECIPIENT_ADDRESS`
  - `REPLY_TO_ADDRESS`
- Add time-driven triggers (such as "Every 10 mininutes")
