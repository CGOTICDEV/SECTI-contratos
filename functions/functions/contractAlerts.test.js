const assert = require('assert');
const alerts = require("./contractAlerts")._test;
const { groupContractsByEmail, daysRemaining, getExpiryThreshold } = alerts;

function run() {
  // groupContractsByEmail should flag unknown contracts
  {
    const contracts = [
      { id: '1', gestor: 'John', fiscal: 'Doe' },
      { id: '2', gestor: 'user@example.com', fiscal: '' },
      { id: '3', gestor: '', fiscal: 'other@example.com' },
    ];
    const map = groupContractsByEmail(contracts);
    assert.ok(map.has('_unknown'));
    assert.strictEqual(map.get('_unknown').length, 1);
    assert.strictEqual(map.get('user@example.com').length, 1);
    assert.strictEqual(map.get('other@example.com').length, 1);
  }

  // should detect emails in array fields (emailEditor)
  {
    const contracts = [
      { id: '4', emailEditor: ['foo@bar.com', 'baz@bar.com'] },
    ];
    const map = groupContractsByEmail(contracts);
    assert.ok(map.has('foo@bar.com'));
    assert.ok(map.has('baz@bar.com'));
    assert.strictEqual(map.get('foo@bar.com').length, 1);
    assert.strictEqual(map.get('baz@bar.com').length, 1);
  }

  // daysRemaining and threshold logic
  {
    const now = new Date();
    const in10 = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
    assert.strictEqual(daysRemaining(in10), 10);
    assert.strictEqual(getExpiryThreshold(10), 15);
    assert.strictEqual(getExpiryThreshold(100), null);
  }

  console.log('all tests passed');
}

if (require.main === module) {
  run();
}
