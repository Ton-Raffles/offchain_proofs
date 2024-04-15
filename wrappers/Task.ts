import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    ExternalAddress,
    Sender,
    SendMode,
} from '@ton/core';
import { Maybe } from '@ton/core/dist/utils/maybe';

export type TaskConfig = {
    publicKey: Buffer;
    admin: Address;
    reward: bigint;
    helperCode: Cell;
    start: bigint;
    periodicity: bigint;
    limit: bigint;
};

export function taskConfigToCell(config: TaskConfig): Cell {
    return beginCell()
        .storeBuffer(config.publicKey)
        .storeUint(0, 2)
        .storeAddress(config.admin)
        .storeCoins(config.reward)
        .storeRef(config.helperCode)
        .storeRef(
            beginCell()
                .storeUint(config.start, 64)
                .storeUint(config.periodicity, 64)
                .storeUint(0, 16)
                .storeCoins(config.limit)
                .storeCoins(0)
                .endCell(),
        )
        .endCell();
}

export function composeDataToSign(
    task: Address,
    user: Address,
    referrer: Maybe<Address | ExternalAddress>,
    validUntil: number,
): Cell {
    return beginCell().storeAddress(task).storeAddress(user).storeAddress(referrer).storeUint(validUntil, 64).endCell();
}

export class Task implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new Task(address);
    }

    static createFromConfig(config: TaskConfig, code: Cell, workchain = 0) {
        const data = taskConfigToCell(config);
        const init = { code, data };
        return new Task(contractAddress(workchain, init), init);
    }

    async sendDeploy(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        opts: {
            queryId?: bigint;
            jettonWallet: Address;
        },
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x5b4e69b9, 32)
                .storeUint(opts.queryId ?? 0, 64)
                .storeAddress(opts.jettonWallet)
                .endCell(),
        });
    }

    async sendClaim(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        opts: {
            queryId?: bigint;
            signature: Buffer;
            data: Cell;
        },
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x456a9261, 32)
                .storeUint(opts.queryId ?? 0, 64)
                .storeBuffer(opts.signature)
                .storeRef(opts.data)
                .endCell(),
        });
    }

    async sendSendServiceMessage(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        opts: {
            queryId?: bigint;
            message: Cell;
            mode: number;
        },
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x000a3c66, 32)
                .storeUint(opts.queryId ?? 0, 64)
                .storeRef(opts.message)
                .storeUint(opts.mode, 8)
                .endCell(),
        });
    }

    async sendWithdrawJettons(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        opts: {
            queryId?: bigint;
            amount: bigint;
        },
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x190592b2, 32)
                .storeUint(opts.queryId ?? 0, 64)
                .storeCoins(opts.amount)
                .endCell(),
        });
    }

    async getHelperAddress(provider: ContractProvider, user: Address) {
        let result = (
            await provider.get('get_stateinit_and_address_of_helper', [
                { type: 'slice', cell: beginCell().storeAddress(user).endCell() },
            ])
        ).stack;
        result.skip(1);
        return result.readAddress();
    }

    async getContractData(provider: ContractProvider) {
        let result = (await provider.get('get_contract_data', [])).stack;
        return {
            publicKey: Buffer.from('0x' + result.readBigNumber().toString(16)),
            jettonWallet: result.readAddress(),
            task: result.readAddress(),
            reward: result.readBigNumber(),
            helperCode: result.readCell(),
            start: result.readNumber(),
            periodicity: result.readNumber(),
            lastPeriod: result.readNumber(),
            limit: result.readNumber(),
            periodAmount: result.readNumber(),
        };
    }
}
