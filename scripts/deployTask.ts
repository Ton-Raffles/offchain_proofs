import { Address, toNano } from '@ton/core';
import { Task } from '../wrappers/Task';
import { compile, NetworkProvider } from '@ton/blueprint';
import { JettonMinter } from '../wrappers/JettonMinter';

export async function run(provider: NetworkProvider) {
    const task = provider.open(Task.createFromConfig({
        admin: Address.parse('EQCJ6QtYriuerrHkFfIbAurua_ODPyj36FeyQ6NdWSHIyetp'),
        publicKey: Buffer.from('2222adf595c4c335dfb7c26c5d9587382741443bafa789958d93d81de1c9caa8', 'hex'),
        helperCode: await compile('Helper'),
        reward: toNano('0.2')
    }, await compile('Task')));

    const jettonMinter = provider.open(JettonMinter.createFromAddress(Address.parse('EQCJbp0kBpPwPoBG-U5C-cWfP_jnksvotGfArPF50Q9Qiv9h')))

    await task.sendDeploy(provider.sender(), toNano('0.05'), {jettonWallet: await jettonMinter.getWalletAddressOf(task.address)});

    await provider.waitForDeploy(task.address);

    // run methods on `task`
}
