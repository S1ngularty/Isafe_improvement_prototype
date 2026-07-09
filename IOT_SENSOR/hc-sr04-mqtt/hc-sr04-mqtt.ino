// HC-SR04 MQTT Sketch
// Reads distance via TRIG/ECHO pulse timing and publishes to MQTT over TLS.

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

#include "secrets.h"

#define TRIG_PIN 27
#define ECHO_PIN 26
#define SOUND_SPEED 0.034
#define MAX_TIMEOUT_US 30000

#define PUBLISH_INTERVAL_MS 10000
#define WIFI_TIMEOUT_MS 20000

WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);

unsigned long lastPublish = 0;
unsigned long lastReconnectAttempt = 0;
unsigned long readingsPublished = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println(F("\n========== HC-SR04 MQTT =========="));
  Serial.println(F("TRIG: GPIO27  |  ECHO: GPIO26 (with voltage divider)"));

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

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

  if (millis() - lastPublish >= PUBLISH_INTERVAL_MS) {
    lastPublish = millis();
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
  float distance = readDistance();

  if (distance < 0) {
    Serial.println(F("No echo - skipping publish"));
    return;
  }

  int distanceMM = (int)(distance * 10);

  char payload[128];
  snprintf(payload, sizeof(payload),
    "{\"sensor_id\":\"hc-sr04-001\",\"distance_mm\":%d,\"water_level_cm\":%.1f}",
    distanceMM, distance);

  if (mqttClient.publish(MQTT_TOPIC, payload)) {
    readingsPublished++;
    Serial.print(F("Published: "));
    Serial.println(payload);
  } else {
    Serial.println(F("Publish failed"));
  }
}

float readDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, MAX_TIMEOUT_US);
  if (duration == 0) return -1;

  return (duration * SOUND_SPEED) / 2.0;
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
