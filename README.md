# Lead Response Recovery Demo for Home-Service Businesses

This proof-of-concept shows how a small home-service company can acknowledge a new inquiry immediately, keep every request in a simple pipeline, notify the owner, and create a human follow-up queue. It is designed for businesses that already use Google Forms, Sheets, and Gmail or can adopt them without buying a new CRM.

## Business outcome

The offer is not an AI chatbot. It is a **lead-response and follow-up workflow** intended to reduce the number of inquiries that receive no acknowledgement or no second touch. The business owner still makes the sales, quoting, and scheduling decisions. Automation handles the repetitive first response, organization, and reminders.

## Demo flow

| Stage | What happens | Business value |
|---|---|---|
| 1. Inquiry | A prospect submits a short request form | The business captures structured contact and service details |
| 2. Immediate acknowledgement | The workflow can send a polite receipt email with a booking link | The prospect knows the request was received |
| 3. Owner alert | The owner receives the lead summary and a simple lead score | The owner can prioritize high-intent requests |
| 4. Pipeline entry | Status, timestamps, and next follow-up time are written to the Sheet | No lead depends on memory or scattered inbox searches |
| 5. Human follow-up | A time-based function can send one follow-up after the configured delay | The business creates a consistent second touch without bulk spam |

## Files

`Code.gs` contains the demonstration script. It starts in `TEST_MODE`, so it logs what would happen rather than sending real messages. The script supports common form-field labels but should be tested against the client’s actual form before use.

`demo.html` is a self-contained visual walkthrough of the workflow. `offer-sheet.md` explains the productized pilot. `execution-brief.md` records the market and offer rationale.

## Safe setup sequence

First, create a copy of the Google Form and its linked response Sheet. Then paste `Code.gs` into the Sheet’s Apps Script editor, update the business name, owner email, and booking URL, and install an `On form submit` trigger for `onFormSubmit`. Run several test submissions using internal email addresses. Only after reviewing the content and permissions should `TEST_MODE` be changed to `false`.

The follow-up function is intentionally separate from the submission trigger. This keeps the first response fast and makes the second touch easy to review. A client should use a low-volume, permission-based workflow rather than a bulk cold-email system.

## Scope and safeguards

This demo does not make promises about conversion rates, provide legal or medical advice, send bulk email, or automatically quote jobs. It requires human review before pricing or scheduling. It should be used only for inquiries the business is permitted to contact. Google Apps Script quotas and limits can change, so production volume must be monitored. See the official [Google Apps Script quota documentation](https://developers.google.com/apps-script/guides/services/quotas).

## Suggested paid pilot

A first pilot can be sold as a fixed-scope implementation: map the current inquiry process, install the form-to-pipeline workflow, customize the acknowledgement and owner alert, test five sample submissions, and provide a one-page handoff guide. The client should pay for the outcome and setup, not for an abstract promise of AI transformation.
