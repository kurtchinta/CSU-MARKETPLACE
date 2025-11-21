import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("CSUMarketplace", function () {
  let csuMarketplace: any;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const CSUMarketplace = await ethers.getContractFactory("CSUMarketplace");
    csuMarketplace = await CSUMarketplace.deploy();
    await csuMarketplace.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await csuMarketplace.owner()).to.equal(owner.address);
    });

    it("Should start with zero transactions", async function () {
      expect(await csuMarketplace.getTotalTransactions()).to.equal(0);
    });
  });

  describe("Store Transaction", function () {
    it("Should store a transaction from Supabase", async function () {
      const supabaseId = 123;
      const itemPrice = 100;

      await expect(
        csuMarketplace.storeTransaction(
          supabaseId,
          user1.address, // buyer
          user2.address, // seller
          "Test Item",
          itemPrice,
          1, // quantity
          0, // ForSale
          0, // GCash
          1  // Accepted
        )
      ).to.emit(csuMarketplace, "TransactionStored");

      const transaction = await csuMarketplace.getTransaction(1);
      expect(transaction.supabaseId).to.equal(supabaseId);
      expect(transaction.buyer).to.equal(user1.address);
      expect(transaction.seller).to.equal(user2.address);
      expect(transaction.itemName).to.equal("Test Item");
      expect(transaction.itemPrice).to.equal(itemPrice);
      expect(transaction.status).to.equal(1); // Accepted
    });

    it("Should not allow duplicate Supabase IDs", async function () {
      await csuMarketplace.storeTransaction(
        123, user1.address, user2.address,
        "Test Item", 100, 1, 0, 0, 1
      );

      await expect(
        csuMarketplace.storeTransaction(
          123, user1.address, user2.address,
          "Another Item", 200, 1, 0, 0, 1
        )
      ).to.be.revertedWith("Already stored");
    });

    it("Should only allow owner to store transactions", async function () {
      await expect(
        csuMarketplace.connect(user1).storeTransaction(
          123, user1.address, user2.address,
          "Test Item", 100, 1, 0, 0, 1
        )
      ).to.be.revertedWith("Not owner");
    });
  });

  describe("Query Functions", function () {
    beforeEach(async function () {
      await csuMarketplace.storeTransaction(
        123, user1.address, user2.address,
        "Item 1", 100, 1, 0, 0, 1
      );
      await csuMarketplace.storeTransaction(
        124, user2.address, user1.address,
        "Item 2", 200, 2, 1, 1, 3
      );
    });

    it("Should get transaction by blockchain ID", async function () {
      const transaction = await csuMarketplace.getTransaction(1);
      expect(transaction.supabaseId).to.equal(123);
      expect(transaction.itemName).to.equal("Item 1");
    });

    it("Should get transaction by Supabase ID", async function () {
      const transaction = await csuMarketplace.getTransactionBySupabaseId(123);
      expect(transaction.itemName).to.equal("Item 1");
      expect(transaction.buyer).to.equal(user1.address);
    });

    it("Should get user transactions", async function () {
      const user1Transactions = await csuMarketplace.getUserTransactions(user1.address);
      expect(user1Transactions.length).to.equal(2); // user1 is in both transactions

      const user2Transactions = await csuMarketplace.getUserTransactions(user2.address);
      expect(user2Transactions.length).to.equal(2); // user2 is in both transactions
    });

    it("Should get user transaction history", async function () {
      const history = await csuMarketplace.getUserTransactionHistory(user1.address);
      expect(history.length).to.equal(2);
      expect(history[0].itemName).to.equal("Item 1");
      expect(history[1].itemName).to.equal("Item 2");
    });

    it("Should get total transactions", async function () {
      const total = await csuMarketplace.getTotalTransactions();
      expect(total).to.equal(2);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to change ownership", async function () {
      await csuMarketplace.changeOwner(user1.address);
      expect(await csuMarketplace.owner()).to.equal(user1.address);
    });

    it("Should not allow non-owner to change ownership", async function () {
      await expect(
        csuMarketplace.connect(user1).changeOwner(user2.address)
      ).to.be.revertedWith("Not owner");
    });
  });

  describe("Error Handling", function () {
    it("Should revert on invalid addresses", async function () {
      await expect(
        csuMarketplace.storeTransaction(
          123, ethers.ZeroAddress, user2.address,
          "Test Item", 100, 1, 0, 0, 1
        )
      ).to.be.revertedWith("Invalid addresses");
    });

    it("Should revert on invalid transaction ID", async function () {
      await expect(
        csuMarketplace.getTransaction(999)
      ).to.be.revertedWith("Invalid ID");
    });

    it("Should revert when getting non-existent Supabase transaction", async function () {
      await expect(
        csuMarketplace.getTransactionBySupabaseId(999)
      ).to.be.revertedWith("Not found");
    });
  });
});