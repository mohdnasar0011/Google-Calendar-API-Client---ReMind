package com.app.reMind.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class EventDto {
private String eventName;
private String description;

private String startDate;
private String startTime;

@JsonProperty("reminderDays")
private int reminderTime;
@JsonProperty("additionalEmails")
private List<String> emails;



}
