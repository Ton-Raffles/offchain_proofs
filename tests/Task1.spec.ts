import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { Task } from '../wrappers/Task';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import { KeyPair, getSecureRandomBytes, keyPairFromSeed } from '@ton/crypto';

describe('Task 1', () => {
    let codeTask: Cell;
    let codeHelper1: Cell;
    let codeJettonMinter: Cell;
    let codeJettonWallet: Cell;

    beforeAll(async () => {
        codeTask = await compile('Task');
        codeHelper1 = await compile('Helper1');
        codeJettonMinter = await compile('JettonMinter');
        codeJettonWallet = await compile('JettonWallet');
    });

    let blockchain: Blockchain;
    let users: SandboxContract<TreasuryContract>[];
    let task: SandboxContract<Task>;
    let jettonMinter: SandboxContract<JettonMinter>;
    let jettonWallets: SandboxContract<JettonWallet>[];
    let keyPair: KeyPair;

    beforeEach(async () => {
        keyPair = keyPairFromSeed(await getSecureRandomBytes(32));

        blockchain = await Blockchain.create();

        users = await blockchain.createWallets(5);

        jettonMinter = blockchain.openContract(
            JettonMinter.createFromConfig(
                {
                    admin: users[0].address,
                    content: Cell.EMPTY,
                    walletCode: codeJettonWallet,
                },
                codeJettonMinter,
            ),
        );
        await jettonMinter.sendDeploy(users[0].getSender(), toNano('0.1'));

        jettonWallets = await Promise.all(
            users.map(async (user) =>
                blockchain.openContract(
                    JettonWallet.createFromAddress(await jettonMinter.getWalletAddressOf(user.address)),
                ),
            ),
        );

        task = blockchain.openContract(
            Task.createFromConfig(
                {
                    publicKey: keyPair.publicKey,
                    admin: users[0].address,
                    helperCode: codeHelper1,
                },
                codeTask,
            ),
        );

        const deployResult = await task.sendDeploy(users[0].getSender(), toNano('0.05'), {
            jettonWallet: await jettonMinter.getWalletAddressOf(task.address),
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: users[0].address,
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
