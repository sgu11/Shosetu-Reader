import { episodeEventChannel, publishToChannel } from "@/lib/redis/pubsub";

export type EpisodeTranslationEvent =
  | {
      type: "translation.progress";
      episodeId: string;
      stage: string;
      processed: number;
      total: number;
      at: string;
    }
  | {
      type: "translation.completed";
      episodeId: string;
      translationId: string;
      modelName: string;
      at: string;
    }
  | {
      type: "translation.failed";
      episodeId: string;
      errorMessage: string;
      at: string;
    }
  | {
      type: "heartbeat";
      at: string;
    };

export async function publishEpisodeEvent(
  episodeId: string,
  event: EpisodeTranslationEvent,
): Promise<void> {
  await publishToChannel(episodeEventChannel(episodeId), event);
}
