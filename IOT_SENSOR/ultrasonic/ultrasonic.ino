// HC-SR04 Distance Sensor with MQTT
// Samples at 50ms internally, publishes smoothed reading every 30s via MQTT/TLS.

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <NewPing.h>

#include "secrets.h"

#define TRIG_PIN 26
#define ECHO_PIN 27
#define MAX_DISTANCE 450

#define PING_INTERVAL_MS 50
#define PUBLISH_INTERVAL_MS 30000
#define WIFI_TIMEOUT_MS 20000

#define WINDOW_SIZE 10

NewPing sonar(TRIG_PIN, ECHO_PIN, MAX_DISTANCE);

WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);

unsigned int sampleWindow[WINDOW_SIZE];
int sampleIndex = 0;
int samplesCollected = 0;
float smoothedDistance = 60;

unsigned long lastPingTime = 0;
unsigned long lastPublishTime = 0;
unsigned long lastReconnectAttempt = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println(F("\n========== HC-SR04 MQTT =========="));
  Serial.println(F("TRIG: GPIO26  |  ECHO: GPIO27"));

  connectWiFi();

  wifiClient.setInsecure();

  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback(callback);
}

void loop() {
  if (!mqttClient.connected()) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > 5000) {
      lastReconnectAttempt = now;
      reconnectMQTT();
    }
  } else {
    mqttClient.loop();
  }

  unsigned long currentTime = millis();

  if (currentTime - lastPingTime >= PING_INTERVAL_MS) {
    lastPingTime = currentTime;

    unsigned int distance = sonar.ping_cm();

    if (distance > 0) {
      sampleWindow[sampleIndex] = distance;
      sampleIndex = (sampleIndex + 1) % WINDOW_SIZE;
      if (samplesCollected < WINDOW_SIZE) samplesCollected++;
    }
  }

  if (currentTime - lastPublishTime >= PUBLISH_INTERVAL_MS) {
    lastPublishTime = currentTime;
    publishReading();
  }
}

void connectWiFi() {
  Serial.print(F("Connecting to WiFi"));
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(F("."));
    if (millis() - start > WIFI_TIMEOUT_MS) {
      Serial.println(F("\nWiFi connection timeout"));
      Serial.println(F("Restarting..."));
      ESP.restart();
    }
  }

  Serial.println();
  Serial.print(F("Connected. IP: "));
  Serial.println(WiFi.localIP());
}

void reconnectMQTT() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  Serial.print(F("Connecting to MQTT..."));

  if (mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
    Serial.println(F(" connected"));
  } else {
    Serial.print(F(" failed (rc="));
    Serial.print(mqttClient.state());
    Serial.println(F(")"));
  }
}

void publishReading() {
  if (samplesCollected == 0) {
    Serial.println(F("No samples collected - skipping publish"));
    return;
  }

  unsigned int farthest = 0;
  for (int i = 0; i < samplesCollected; i++) {
    if (sampleWindow[i] > farthest) farthest = sampleWindow[i];
  }

  float diff = abs((float)farthest - smoothedDistance);

  if (diff > 2) {
    if (diff > 30) {
      smoothedDistance = (farthest * 0.7) + (smoothedDistance * 0.3);
    } else {
      smoothedDistance = (farthest * 0.4) + (smoothedDistance * 0.6);
    }
  }

  int distanceMM = (int)(smoothedDistance * 10);

  Serial.print(F("Distance: "));
  Serial.print(smoothedDistance);
  Serial.println(F(" cm"));

  char payload[128];
  snprintf(payload, sizeof(payload),
    "{\"sensor_id\":\"hc-sr04-001\",\"distance_mm\":%d,\"water_level_cm\":%.1f}",
    distanceMM, smoothedDistance);

  if (mqttClient.publish(MQTT_TOPIC, payload)) {
    Serial.print(F("Published: "));
    Serial.println(payload);
  } else {
    Serial.println(F("Publish failed"));
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print(F("MQTT msg ["));
  Serial.print(topic);
  Serial.print(F("]: "));
  for (unsigned int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();
}
