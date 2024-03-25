import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { Task } from '../wrappers/Task';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Task', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Task');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let task: SandboxContract<Task>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        task = blockchain.openContract(Task.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await task.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: task.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and task are ready to use
    });
});
