import { toNano } from '@ton/core';
import { Task } from '../wrappers/Task';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const task = provider.open(Task.createFromConfig({}, await compile('Task')));

    await task.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(task.address);

    // run methods on `task`
}
