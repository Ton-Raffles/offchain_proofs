import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type Helper1Config = {};

export function helper1ConfigToCell(config: Helper1Config): Cell {
    return beginCell().endCell();
}

export class Helper1 implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new Helper1(address);
    }

    static createFromConfig(config: Helper1Config, code: Cell, workchain = 0) {
        const data = helper1ConfigToCell(config);
        const init = { code, data };
        return new Helper1(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
