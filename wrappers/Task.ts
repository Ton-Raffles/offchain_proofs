import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type TaskConfig = {};

export function taskConfigToCell(config: TaskConfig): Cell {
    return beginCell().endCell();
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

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
