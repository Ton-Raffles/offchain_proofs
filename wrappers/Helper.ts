import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type HelperConfig = {};

export function helperConfigToCell(config: HelperConfig): Cell {
    return beginCell().endCell();
}

export class Helper implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Helper(address);
    }

    static createFromConfig(config: HelperConfig, code: Cell, workchain = 0) {
        const data = helperConfigToCell(config);
        const init = { code, data };
        return new Helper(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
