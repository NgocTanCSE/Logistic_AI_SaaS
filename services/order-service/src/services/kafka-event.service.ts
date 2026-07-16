import { Injectable, Inject, Logger, OnModuleInit, Optional } from "@nestjs/common"
import { ClientKafka } from "@nestjs/microservices"

@Injectable()
export class KafkaEventService implements OnModuleInit {
  private readonly logger = new Logger("KafkaEventService")
  private connected = false
  private eventBuffer: { topic: string; message: string }[] = []

  constructor(
    @Optional() @Inject("KAFKA_SERVICE") private readonly kafkaClient: ClientKafka | null
  ) {}

  async onModuleInit() {
    if (!this.kafkaClient) {
      this.logger.log("Kafka disabled (KAFKA_BROKERS not set). Events will be buffered in memory.")
      return
    }
    try {
      await this.kafkaClient.connect()
      this.connected = true
      this.logger.log("Connected to Kafka successfully")

      for (const evt of this.eventBuffer) {
        try {
          this.kafkaClient.emit(evt.topic, evt.message)
        } catch (e) {
          this.logger.error(`Failed to flush buffered event ${evt.topic}: ${e instanceof Error ? e.message : "Unknown"}`)
        }
      }
      this.eventBuffer = []
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error"
      this.logger.warn(`Failed to connect to Kafka: ${msg}. Events will be buffered in memory.`)
    }
  }

  emit(topic: string, message: any): void {
    const payload = JSON.stringify(message)
    if (!this.kafkaClient || !this.connected) {
      this.eventBuffer.push({ topic, message: payload })
      this.logger.warn(`Kafka not connected — buffered event: ${topic}`)
      return
    }
    try {
      this.kafkaClient.emit(topic, payload)
    } catch (e) {
      this.logger.error(`Kafka emit failed for topic ${topic}: ${e instanceof Error ? e.message : "Unknown"}`)
      this.eventBuffer.push({ topic, message: payload })
    }
  }

  isConnected(): boolean {
    return this.connected && !!this.kafkaClient
  }
}