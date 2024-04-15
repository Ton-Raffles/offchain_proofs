import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export class Helper implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new Helper(address);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async getContractData(provider: ContractProvider) {
        let result = (await provider.get('get_contract_data', [])).stack;
        return {
            claimed: result.readBoolean(),
            task: result.readAddress(),
            user: result.readAddress(),
            referrals: result.readNumber(),
            lastActivity: result.readNumber(),
            periodicity: result.readNumber(),
            start: result.readNumber(),
            lastPeriod: result.readNumber(),
        };
    }
}
