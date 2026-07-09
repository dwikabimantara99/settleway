# Settleway 3-Minute Demo Script

**(Scene 1: Introduction - 0:00 to 0:30)**

**Presenter:**
"Hello everyone, welcome to Settleway. We are building the trust layer for agricultural B2B trade. Right now, when a buyer and seller want to trade commodities, they face a massive trust gap. Who sends the money first? Who ships the goods first? Settleway solves this by wrapping a robust marketplace inside a deterministic, dual-sided Deal Room powered by the Stellar network."

**(Scene 2: Marketplace Discovery & Negotiation - 0:30 to 1:00)**

**Presenter:**
"Let's step into the shoes of our users. Our farmer, the seller, has listed a bulk shipment of premium commodities on the platform. A verified buyer discovers this supply and immediately submits an offer. After a quick negotiation, both parties agree to the exact price and volume. With the terms settled, Settleway automatically opens a secure, mutual Deal Room."

**(Scene 3: The Deal Room & The Funding Corridor - 1:00 to 2:15)**

**Presenter:**
"This Deal Room is where Settleway stands apart. To ensure absolute commitment, both the buyer and the seller are required to put skin in the game. 

Using Settleway's managed wallets, the buyer deposits the principal payment and their performance bond. Simultaneously, the seller deposits their respective performance bond. Behind the scenes, Settleway programmatically provisions these wallets and bridges the intent to the Stellar Testnet. 

We can see here, recorded transparently on the ledger, that these funds have been locked into a Soroban smart contract. We have the exact transaction hashes for both the buyer's deposit and the seller's deposit. 

Once both deposits are mathematically verified on-chain, the Settleway Deal Room updates to its final protected state: `LOCKED`."

**(Scene 4: The Horizon & Conclusion - 2:15 to 3:00)**

**Presenter:**
"What we've just demonstrated is our fully proven, persistent Testnet funding corridor. We've bridged marketplace intent with cryptographic ledger settlement without any manual intervention. 

While the exact downstream lifecycle—submitting proof of delivery, buyer acceptance, and final automated payout settlement—is currently being developed as our next extension phase, this `LOCKED` state proves Settleway's core architectural thesis. We can successfully secure B2B trade using dual-sided bonds and smart contracts.

Thank you for watching the Settleway demo."
