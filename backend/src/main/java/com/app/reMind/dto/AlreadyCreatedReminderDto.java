package com.app.reMind.dto;

import lombok.Data;

@Data
public class AlreadyCreatedReminderDto {

    private String eventName;
    private String description;
    private String startDate;
    private String startTime;
    private String eventId;

}
