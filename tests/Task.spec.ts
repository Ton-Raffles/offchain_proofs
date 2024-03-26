import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { Cell, beginCell, toNano } from '@ton/core';
import { Task, composeDataToSign } from '../wrappers/Task';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import { KeyPair, getSecureRandomBytes, keyPairFromSeed, sign } from '@ton/crypto';
import { Helper } from '../wrappers/Helper';

describe('Task 1', () => {
    let codeTask: Cell;
    let codeHelper: Cell;
    let codeJettonMinter: Cell;
    let codeJettonWallet: Cell;

    beforeAll(async () => {
        codeTask = await compile('Task');
        codeHelper = await compile('Helper');
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

        blockchain.now = 10000;

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
                    helperCode: codeHelper,
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

        await jettonMinter.sendMint(users[0].getSender(), toNano('0.05'), 0n, task.address, toNano('1000'));
    });

    it('should deploy', async () => {
        await task.getContractData();
    });

    it('should claim reward', async () => {
        const dataToSign = composeDataToSign(
            task.address,
            users[1].address,
            null,
            toNano('10'),
            blockchain.now! + 1000,
        );

        const signature = sign(dataToSign.hash(), keyPair.secretKey);

        const result = await task.sendClaim(users[1].getSender(), toNano('0.175'), {
            data: dataToSign,
            signature,
        });

        expect(result.transactions).toHaveTransaction({
            from: users[1].address,
            to: task.address,
            success: true,
        });

        expect(result.transactions).toHaveLength(8);

        expect(await jettonWallets[1].getJettonBalance()).toBe(toNano('10'));
    });

    it('should claim reward with referrer', async () => {
        const dataToSign = composeDataToSign(
            task.address,
            users[1].address,
            users[2].address,
            toNano('10'),
            blockchain.now! + 1000,
        );

        const signature = sign(dataToSign.hash(), keyPair.secretKey);

        const result = await task.sendClaim(users[1].getSender(), toNano('0.175'), {
            data: dataToSign,
            signature,
        });

        expect(result.transactions).toHaveTransaction({
            from: users[1].address,
            to: task.address,
            success: true,
        });

        expect(result.transactions).toHaveLength(8);

        expect(await jettonWallets[1].getJettonBalance()).toBe(toNano('10'));

        const helper = blockchain.openContract(Helper.createFromAddress(await task.getHelperAddress(users[2].address)));
        expect((await helper.getContractData()).referrals).toEqual(1);
    });

    it('should not claim reward if signature is incorrect', async () => {
        const dataToSign = composeDataToSign(
            task.address,
            users[1].address,
            null,
            toNano('10'),
            blockchain.now! + 1000,
        );

        const result = await task.sendClaim(users[1].getSender(), toNano('0.175'), {
            data: dataToSign,
            signature: await getSecureRandomBytes(64),
        });

        expect(result.transactions).toHaveTransaction({
            from: users[1].address,
            to: task.address,
            success: false,
            exitCode: 901,
        });

        expect(result.transactions).toHaveLength(3);

        expect(await jettonWallets[1].getJettonBalance()).toBe(0n);
    });

    it('should not claim reward if valid_until is in the past', async () => {
        const dataToSign = composeDataToSign(
            task.address,
            users[1].address,
            null,
            toNano('10'),
            blockchain.now! - 1000,
        );

        const signature = sign(dataToSign.hash(), keyPair.secretKey);

        const result = await task.sendClaim(users[1].getSender(), toNano('0.175'), {
            data: dataToSign,
            signature,
        });

        expect(result.transactions).toHaveTransaction({
            from: users[1].address,
            to: task.address,
            success: false,
            exitCode: 902,
        });

        expect(result.transactions).toHaveLength(3);

        expect(await jettonWallets[1].getJettonBalance()).toBe(0n);
    });

    it('should not claim reward if sender is not the same as in the signature', async () => {
        const dataToSign = composeDataToSign(
            task.address,
            users[2].address,
            null,
            toNano('10'),
            blockchain.now! + 1000,
        );

        const signature = sign(dataToSign.hash(), keyPair.secretKey);

        const result = await task.sendClaim(users[1].getSender(), toNano('0.175'), {
            data: dataToSign,
            signature,
        });

        expect(result.transactions).toHaveTransaction({
            from: users[1].address,
            to: task.address,
            success: false,
            exitCode: 903,
        });

        expect(result.transactions).toHaveLength(3);

        expect(await jettonWallets[1].getJettonBalance()).toBe(0n);
    });

    it('should not claim reward if task is not the same as in the signature', async () => {
        const dataToSign = composeDataToSign(
            users[2].address,
            users[1].address,
            null,
            toNano('10'),
            blockchain.now! + 1000,
        );

        const signature = sign(dataToSign.hash(), keyPair.secretKey);

        const result = await task.sendClaim(users[1].getSender(), toNano('0.175'), {
            data: dataToSign,
            signature,
        });

        expect(result.transactions).toHaveTransaction({
            from: users[1].address,
            to: task.address,
            success: false,
            exitCode: 904,
        });

        expect(result.transactions).toHaveLength(3);

        expect(await jettonWallets[1].getJettonBalance()).toBe(0n);
    });

    it('should not claim reward if already claimed', async () => {
        const dataToSign = composeDataToSign(
            task.address,
            users[1].address,
            null,
            toNano('10'),
            blockchain.now! + 1000,
        );

        const signature = sign(dataToSign.hash(), keyPair.secretKey);

        await task.sendClaim(users[1].getSender(), toNano('0.175'), {
            data: dataToSign,
            signature,
        });

        const result = await task.sendClaim(users[1].getSender(), toNano('0.175'), {
            data: dataToSign,
            signature,
        });

        expect(result.transactions).toHaveTransaction({
            from: users[1].address,
            to: task.address,
            success: true,
        });

        expect(result.transactions).toHaveTransaction({
            on: await task.getHelperAddress(users[1].address),
            success: false,
            exitCode: 905,
        });

        expect(result.transactions).toHaveLength(3);

        expect(await jettonWallets[1].getJettonBalance()).toBe(toNano('10'));
    });

    it('should not claim reward if not enough value', async () => {
        const dataToSign = composeDataToSign(
            task.address,
            users[1].address,
            null,
            toNano('10'),
            blockchain.now! + 1000,
        );

        const signature = sign(dataToSign.hash(), keyPair.secretKey);

        const result = await task.sendClaim(users[1].getSender(), toNano('0.1'), {
            data: dataToSign,
            signature,
        });

        expect(result.transactions).toHaveTransaction({
            from: users[1].address,
            to: task.address,
            success: false,
            exitCode: 906,
        });

        expect(result.transactions).toHaveLength(3);

        expect(await jettonWallets[1].getJettonBalance()).toBe(0n);
    });
});
