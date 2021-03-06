const MattCoin = artifacts.require("MattCoin.sol");
const MattCoinSale = artifacts.require("MattCoinSale.sol");

contract('MattCoin', function(accounts) {
    var tokenInstance; 
    var tokenSaleInstance;
    var tokenPrice = 1000000000000000;
    var admin = accounts[0];
    var buyer = accounts[1];
    var tokensAvailable = 750000;
    var numberOfTokens;
    it('initialized contract with correct values', function() {
        return MattCoinSale.deployed().then(function(instance) {
            tokenSaleInstance = instance;
            return tokenSaleInstance.address;
        }).then(function(address) {
            assert.notEqual(address, 0x0, 'has contract address');
            return tokenSaleInstance.tokenContract();
        }).then(function(address) {
            assert.notEqual(address, 0x0, 'has token contract address');
            return tokenSaleInstance.tokenPrice();
        }).then(function(price) {
            assert.equal(price, tokenPrice, 'token price is correct')
        })
    })

    it('facilitates token buying', function() {
        return MattCoin.deployed().then(function(instance) {
            tokenInstance = instance;
            return MattCoinSale.deployed();
        }).then(function(instance) {
            tokenSaleInstance = instance;
            return tokenInstance.transfer(tokenSaleInstance.address, tokensAvailable, { from: admin });
        }).then(function(receipt) {
            numberOfTokens = 10;
            return tokenSaleInstance.buyTokens(numberOfTokens, { from: buyer, value: numberOfTokens * tokenPrice });
        }).then(function(receipt) {
            assert.equal(receipt.logs.length, 1, 'triggers event');
            assert.equal(receipt.logs[0].event, 'Sell', "should be sell event");
            assert.equal(receipt.logs[0].args._buyer, buyer, "should have right buyer");
            assert.equal(receipt.logs[0].args._amount, numberOfTokens, "should have right amout");
            return tokenSaleInstance.tokensSold();
        }).then(function(amount) {
            assert.equal(amount.toNumber(), numberOfTokens, 'increments the number of tokens sold');
            return tokenInstance.balanceOf(buyer)
        }).then(function(balance) {
            assert.equal(balance, numberOfTokens)
            return tokenInstance.balanceOf(tokenSaleInstance.address)
        }).then(function(balance) {
            assert.equal(balance, tokensAvailable - numberOfTokens)
            return tokenSaleInstance.buyTokens(numberOfTokens, { from: buyer, value: 1 })
        }).then(assert.fail).catch(function(error) {
            assert(error.message.indexOf('revert') >= 0, 'msg.value must equal number of tokens in wei')
            return tokenSaleInstance.buyTokens(800000, { from: buyer, value: 800000 * tokenPrice})
        }).then(assert.fail).catch(function(error) {
            console.log(error.message)
            assert(error.message.indexOf('revert') >= 0, 'sale contract must have enough tokens')
        })
    })

    it('ends token sale', function() {
        return MattCoin.deployed().then(function(instance) {
            tokenInstance = instance;
            return MattCoinSale.deployed();
        }).then(function(instance) {
            tokenSaleInstance = instance;
            return tokenSaleInstance.endSale({ from: buyer })
        }).then(assert.fail).catch(function(error) {
            assert(error.message.indexOf('revert') >= 0, 'must be admin to end sale')
            return tokenSaleInstance.endSale({ from: admin })
        }).then(function(receipt) {
            return tokenInstance.balanceOf(admin);
        }).then(function(balance) {
            assert.equal(balance.toNumber(), 999990, 'returns all tokens to admin')
            balance = web3.eth.getBalance(tokenSaleInstance.address).then(function(balance) {
                assert.equal(balance.toNumber(), 0);
            });
            
        })
    })

})