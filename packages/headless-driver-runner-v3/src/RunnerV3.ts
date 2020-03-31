import { akashicEngine as g, gameDriver as gdr } from "@akashic/engine-files";
import { Runner } from "@akashic/headless-driver-runner";
import { PlatformV3 } from "./platform/PlatformV3";

export type RunnerV3Game = g.Game;

export class RunnerV3 extends Runner {
	private driver: gdr.GameDriver;

	get engineVersion(): string {
		return "3";
	}

	// NOTE: 暫定的にデバッグ用として g.Game を返している
	async start(): Promise<RunnerV3Game | null> {
		let game: RunnerV3Game | null = null;

		try {
			game = await this.initGameDriver();
		} catch (e) {
			this.onError(e);
		}

		return game;
	}

	stop(): void {
		if (this.driver) {
			this.driver.stopGame();
			this.driver = null;
		}
	}

	changeGameDriverState(param: gdr.GameDriverInitializeParameterObject): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.driver) {
				reject(new Error("Game is not started"));
				return;
			}
			this.driver.changeState(param, (err) => (err ? reject(err) : resolve()));
		});
	}

	private initGameDriver(): Promise<RunnerV3Game> {
		return new Promise<RunnerV3Game>((resolve, reject) => {
			if (this.driver) {
				this.driver.destroy();
				this.driver = null;
			}

			const player = {
				id: this.player ? this.player.id : undefined,
				name: this.player ? this.player.name : undefined
			};

			const executionMode = this.executionMode === "active" ? gdr.ExecutionMode.Active : gdr.ExecutionMode.Passive;

			const platform = new PlatformV3({
				configurationBaseUrl: this.configurationBaseUrl,
				assetBaseUrl: this.assetBaseUrl,
				amflow: this.amflow,
				sendToExternalHandler: (data: any) => this.onSendedToExternal(data),
				errorHandler: (e: any) => this.onError(e)
			});

			const driver = new gdr.GameDriver({
				platform,
				player,
				errorHandler: (e: any) => this.onError(e)
			});

			this.driver = driver;

			// TODO: パラメータを外部から変更可能にする
			driver.initialize(
				{
					configurationUrl: this.configurationUrl,
					configurationBase: this.configurationBaseUrl,
					assetBase: this.assetBaseUrl,
					driverConfiguration: {
						playId: this.playId,
						playToken: this.playToken,
						executionMode
					},
					loopConfiguration: {
						loopMode: gdr.LoopMode.Realtime
					},
					gameArgs: this.gameArgs
				},
				(e: any) => {
					if (e) {
						reject(e);
						return;
					}
					driver.startGame();
				}
			);

			driver.gameCreatedTrigger.addOnce((game: RunnerV3Game) => {
				game._started.addOnce(() => resolve(game));
			});
		});
	}

	private onSendedToExternal(data: any): void {
		this.sendToExternalTrigger.fire(data);
	}
}
