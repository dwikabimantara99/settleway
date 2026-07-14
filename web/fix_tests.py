import re

with open('src/lib/stellar/server/deal-reconciliation.test.ts', 'r') as f:
    content = f.read()

# Replace any occurrence of requested_action OR action with the correct fields
content = re.sub(
    r"actor_id: 'buyer-1',\s+(requested_action|action): 'accept_delivery_custody',(\s+expected_local_status: 'DELIVERED',)?(\s+stellar_method: 'accept_delivery_custody',)?",
    "requested_action: 'accept_delivery_custody',\n      expected_local_status: 'DELIVERED',\n      stellar_method: 'settle_and_complete',",
    content
)

with open('src/lib/stellar/server/deal-reconciliation.test.ts', 'w') as f:
    f.write(content)
