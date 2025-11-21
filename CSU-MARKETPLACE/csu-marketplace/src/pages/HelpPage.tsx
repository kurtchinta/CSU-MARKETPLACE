import { useState } from 'react';
import { ChevronDown, ChevronUp, Wallet, Coins, ShoppingCart, CheckCircle } from 'lucide-react';

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ title, children, icon }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg mb-4 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-[#208756]">{icon}</span>}
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-[#208756]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#208756]" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};

const HelpPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-[#208756] text-white py-12">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-4xl font-bold mb-3">Help Center</h1>
          <p className="text-lg opacity-90">
            Complete guide to getting started with CSU Marketplace
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Getting Started Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-2 border-b-2 border-[#208756]">
            Getting Started
          </h2>

          <AccordionItem 
            title="Step 1: Install MetaMask Wallet" 
            icon={<Wallet className="w-6 h-6" />}
          >
            <div className="space-y-4 text-gray-700">
              <p className="font-semibold text-gray-800">What is MetaMask?</p>
              <p>
                MetaMask is a cryptocurrency wallet that allows you to interact with blockchain applications. 
                It's required to make secure transactions on CSU Marketplace.
              </p>

              <p className="font-semibold text-gray-800 mt-6">Installation Steps:</p>
              <ol className="list-decimal list-inside space-y-3 ml-4">
                <li>
                  Visit the official MetaMask website:{' '}
                  <a 
                    href="https://metamask.io/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#208756] hover:underline font-medium"
                  >
                    https://metamask.io/
                  </a>
                </li>
                <li>Click on "Download" and select your browser (Chrome, Firefox, Brave, or Edge)</li>
                <li>Install the browser extension from your browser's extension store</li>
                <li>Click on the MetaMask icon in your browser toolbar</li>
                <li>Click "Create a new wallet"</li>
                <li>Create a strong password for your wallet</li>
                <li>
                  <strong className="text-red-600">CRITICAL:</strong> Write down your Secret Recovery Phrase (12 words) 
                  and store it in a safe place. Never share this with anyone!
                </li>
                <li>Confirm your Secret Recovery Phrase to complete setup</li>
              </ol>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
                <p className="font-semibold text-yellow-800">⚠️ Important Security Notes:</p>
                <ul className="list-disc list-inside space-y-1 mt-2 text-yellow-700">
                  <li>Never share your Secret Recovery Phrase with anyone</li>
                  <li>MetaMask will never ask for your Secret Recovery Phrase</li>
                  <li>Store your recovery phrase offline in a secure location</li>
                  <li>Use a strong, unique password for your wallet</li>
                </ul>
              </div>
            </div>
          </AccordionItem>

          <AccordionItem 
            title="Step 2: Configure Sepolia Testnet" 
            icon={<Coins className="w-6 h-6" />}
          >
            <div className="space-y-4 text-gray-700">
              <p className="font-semibold text-gray-800">What is Sepolia Testnet?</p>
              <p>
                Sepolia is a test network for Ethereum that allows you to use the marketplace without spending real money. 
                Test ETH has no real-world value and is used for testing purposes only.
              </p>

              <p className="font-semibold text-gray-800 mt-6">Configuration Steps:</p>
              <ol className="list-decimal list-inside space-y-3 ml-4">
                <li>Open your MetaMask wallet extension</li>
                <li>Click on the network dropdown at the top (it may say "Ethereum Mainnet")</li>
                <li>Enable "Show test networks" in settings if you don't see test networks</li>
                <li>Select "Sepolia Test Network" from the list</li>
                <li>Your wallet is now connected to the Sepolia testnet</li>
              </ol>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-6">
                <p className="font-semibold text-blue-800">💡 Tip:</p>
                <p className="text-blue-700 mt-1">
                  You can switch between networks anytime using the network dropdown in MetaMask. 
                  Make sure you're on Sepolia when using CSU Marketplace.
                </p>
              </div>
            </div>
          </AccordionItem>

          <AccordionItem 
            title="Step 3: Get Sepolia Test ETH (Faucet)" 
            icon={<Coins className="w-6 h-6" />}
          >
            <div className="space-y-4 text-gray-700">
              <p className="font-semibold text-gray-800">What is a Faucet?</p>
              <p>
                A faucet is a service that provides free test cryptocurrency for development and testing purposes. 
                You'll need Sepolia ETH to pay for transaction fees (gas) when buying or selling items.
              </p>

              <p className="font-semibold text-gray-800 mt-6">How to Get Sepolia ETH:</p>
              <ol className="list-decimal list-inside space-y-3 ml-4">
                <li>Copy your wallet address from MetaMask (click on your account name to copy)</li>
                <li>
                  Visit the Sepolia PoW Faucet:{' '}
                  <a 
                    href="https://sepolia-faucet.pk910.de/#/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#208756] hover:underline font-medium"
                  >
                    https://sepolia-faucet.pk910.de/#/
                  </a>
                </li>
                <li>Paste your wallet address in the input field</li>
                <li>Click "Start Mining" to begin the mining process</li>
                <li>Keep the browser tab open while mining (it may take 10-30 minutes)</li>
                <li>Once you've mined enough, click "Stop Mining" and "Claim Rewards"</li>
                <li>Wait for the transaction to complete</li>
                <li>Check your MetaMask wallet - you should see Sepolia ETH balance</li>
              </ol>

              <div className="bg-green-50 border-l-4 border-[#208756] p-4 mt-6">
                <p className="font-semibold text-[#208756]">✓ Alternative Faucets:</p>
                <p className="text-gray-700 mt-2">If the primary faucet is busy, try these alternatives:</p>
                <ul className="list-disc list-inside space-y-1 mt-2 text-gray-600">
                  <li>
                    <a 
                      href="https://sepoliafaucet.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#208756] hover:underline"
                    >
                      SepoliaFaucet.com
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://www.alchemy.com/faucets/ethereum-sepolia" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#208756] hover:underline"
                    >
                      Alchemy Sepolia Faucet
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </AccordionItem>
        </section>

        {/* Using the System Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-2 border-b-2 border-[#208756]">
            Using CSU Marketplace
          </h2>

          <AccordionItem 
            title="Creating an Account" 
            icon={<CheckCircle className="w-6 h-6" />}
          >
            <div className="space-y-4 text-gray-700">
              <p className="font-semibold text-gray-800">Dual Authentication System:</p>
              <p>
                CSU Marketplace uses both email authentication and blockchain wallet connection 
                for enhanced security and functionality.
              </p>

              <ol className="list-decimal list-inside space-y-3 ml-4 mt-4">
                <li>Click "Sign Up" on the homepage</li>
                <li>Enter your email address and create a password</li>
                <li>Verify your email address by clicking the confirmation link sent to your inbox</li>
                <li>Connect your MetaMask wallet when prompted</li>
                <li>Your account is now ready to use!</li>
              </ol>
            </div>
          </AccordionItem>

          <AccordionItem 
            title="Browsing and Searching Products" 
            icon={<ShoppingCart className="w-6 h-6" />}
          >
            <div className="space-y-4 text-gray-700">
              <ol className="list-decimal list-inside space-y-3 ml-4">
                <li>Navigate to the "Browse" page from the main menu</li>
                <li>Use the search bar to find specific items</li>
                <li>Filter products by category, price range, or condition</li>
                <li>Click on any product to view detailed information</li>
                <li>Check product images, description, and seller information</li>
              </ol>
            </div>
          </AccordionItem>

          <AccordionItem 
            title="Making a Purchase (Blockchain Transaction)" 
            icon={<ShoppingCart className="w-6 h-6" />}
          >
            <div className="space-y-4 text-gray-700">
              <p className="font-semibold text-gray-800">How Blockchain Purchases Work:</p>
              <p>
                When you buy an item, the transaction is recorded on the Ethereum blockchain, 
                ensuring transparency, security, and immutability. This creates a permanent record 
                of the sale that cannot be altered or deleted.
              </p>

              <p className="font-semibold text-gray-800 mt-6">Purchase Steps:</p>
              <ol className="list-decimal list-inside space-y-3 ml-4">
                <li>Find the product you want to purchase and click "Add to Cart" or "Buy Now"</li>
                <li>Review your cart and click "Proceed to Checkout"</li>
                <li>Verify your shipping information and order details</li>
                <li>Click "Place Order" to initiate the blockchain transaction</li>
                <li>
                  MetaMask will pop up asking you to confirm the transaction:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>Review the transaction amount and gas fee</li>
                    <li>The gas fee is a small network fee (usually a few cents worth of ETH)</li>
                    <li>Click "Confirm" to approve the transaction</li>
                  </ul>
                </li>
                <li>Wait for the transaction to be processed (usually 15-30 seconds)</li>
                <li>Once confirmed, you'll see an order confirmation</li>
                <li>The transaction is now permanently recorded on the blockchain!</li>
              </ol>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-6">
                <p className="font-semibold text-blue-800">📊 Understanding Gas Fees:</p>
                <p className="text-blue-700 mt-2">
                  Gas fees are network transaction costs that go to blockchain validators, not to CSU Marketplace. 
                  These fees vary based on network congestion. On Sepolia testnet, you're using free test ETH, 
                  so there's no real cost to you.
                </p>
              </div>

              <div className="bg-green-50 border-l-4 border-[#208756] p-4 mt-6">
                <p className="font-semibold text-[#208756]">✓ Benefits of Blockchain Transactions:</p>
                <ul className="list-disc list-inside space-y-1 mt-2 text-gray-700">
                  <li><strong>Transparency:</strong> All transactions are publicly verifiable</li>
                  <li><strong>Security:</strong> Cryptographically secured and tamper-proof</li>
                  <li><strong>Immutability:</strong> Once recorded, transactions cannot be altered</li>
                  <li><strong>Decentralization:</strong> No single entity controls the transaction record</li>
                </ul>
              </div>
            </div>
          </AccordionItem>

          <AccordionItem 
            title="Creating a Listing (Selling Items)" 
            icon={<CheckCircle className="w-6 h-6" />}
          >
            <div className="space-y-4 text-gray-700">
              <ol className="list-decimal list-inside space-y-3 ml-4">
                <li>Click "Create Listing" from your dashboard or navigation menu</li>
                <li>Upload clear photos of your item (up to 5 images)</li>
                <li>Enter product details:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>Title and description</li>
                    <li>Category and condition</li>
                    <li>Price and quantity</li>
                    <li>Pickup location or shipping options</li>
                  </ul>
                </li>
                <li>Review your listing and click "Publish"</li>
                <li>Your item is now live and visible to buyers!</li>
              </ol>
            </div>
          </AccordionItem>

          <AccordionItem 
            title="Managing Orders and Transactions" 
            icon={<CheckCircle className="w-6 h-6" />}
          >
            <div className="space-y-4 text-gray-700">
              <p className="font-semibold text-gray-800">Tracking Your Activity:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>My Orders:</strong> View all purchases you've made, including transaction status 
                  and blockchain confirmation
                </li>
                <li>
                  <strong>My Listings:</strong> Manage your active listings, edit details, or mark items as sold
                </li>
                <li>
                  <strong>Transaction History:</strong> View complete blockchain transaction records with 
                  transaction hashes for verification
                </li>
                <li>
                  <strong>Dashboard:</strong> Overview of your account activity, favorites, and statistics
                </li>
              </ul>
            </div>
          </AccordionItem>
        </section>

        {/* Troubleshooting Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-2 border-b-2 border-[#208756]">
            Troubleshooting
          </h2>

          <AccordionItem title="MetaMask Connection Issues">
            <div className="space-y-3 text-gray-700">
              <p><strong>Problem:</strong> MetaMask not connecting or showing errors</p>
              <p><strong>Solutions:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Make sure you're on the Sepolia Test Network in MetaMask</li>
                <li>Refresh the page and try connecting again</li>
                <li>Check if MetaMask is unlocked (click the extension icon)</li>
                <li>Clear your browser cache and cookies</li>
                <li>Try using a different browser</li>
                <li>Ensure MetaMask extension is up to date</li>
              </ul>
            </div>
          </AccordionItem>

          <AccordionItem title="Transaction Failed or Pending">
            <div className="space-y-3 text-gray-700">
              <p><strong>Problem:</strong> Transaction stuck or failed</p>
              <p><strong>Solutions:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Check if you have enough Sepolia ETH for gas fees</li>
                <li>Wait a few minutes - network congestion can cause delays</li>
                <li>Check MetaMask activity tab for transaction status</li>
                <li>If stuck, you may need to speed up or cancel the transaction in MetaMask</li>
                <li>Try increasing gas limit if the transaction keeps failing</li>
              </ul>
            </div>
          </AccordionItem>

          <AccordionItem title="Can't See My Balance or Items">
            <div className="space-y-3 text-gray-700">
              <p><strong>Problem:</strong> Wallet balance or listings not showing</p>
              <p><strong>Solutions:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Verify you're connected to the correct wallet address</li>
                <li>Make sure you're on the Sepolia network</li>
                <li>Refresh the page to reload blockchain data</li>
                <li>Check if you're logged in with the correct email account</li>
                <li>Clear browser cache and reconnect your wallet</li>
              </ul>
            </div>
          </AccordionItem>
        </section>

        {/* Contact Section */}
        <section className="bg-gradient-to-r from-[#208756] to-[#1a6d45] text-white rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Need More Help?</h2>
          <p className="text-lg mb-6 opacity-90">
            Our support team is here to assist you with any questions or issues.
          </p>
          <div className="space-y-2">
            <p className="text-sm">
              📧 Email: <a href="mailto:support@csumarketplace.com" className="underline hover:opacity-80">support@csumarketplace.com</a>
            </p>
            <p className="text-sm opacity-75">We typically respond within 24 hours</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HelpPage;
