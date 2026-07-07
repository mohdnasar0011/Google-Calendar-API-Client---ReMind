package com.app.reMind.service;

import com.app.reMind.dto.AlreadyCreatedReminderDto;
import com.app.reMind.dto.EventDto;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.*;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import com.google.api.client.http.HttpRequestInitializer;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class CalenderClientService  {


    public String apiSetup(HttpSession session) {


        GoogleCredential credential = new GoogleCredential().setAccessToken((String)session.getAttribute("accessToken"));

        Calendar calendar = new Calendar.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance(),credential)
                .setApplicationName("ReMind")
                .build();

        return "workedTillApiConnection";
    }

    public List<AlreadyCreatedReminderDto> existingEvents(HttpSession session) throws IOException {


        GoogleCredential credential = new GoogleCredential().setAccessToken((String) session.getAttribute("accessToken"));

        Calendar calendar = new Calendar.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance(), credential)
                .setApplicationName("ReMind")
                .build();

        Events event = calendar.events()
                .list("primary")
                .setTimeMin(new DateTime(System.currentTimeMillis()))
                .setSingleEvents(true)
                .setOrderBy("startTime")
                .execute();

        List<AlreadyCreatedReminderDto> reminders = new ArrayList<>();
        for (Event e : event.getItems()) {
            AlreadyCreatedReminderDto dto = new AlreadyCreatedReminderDto();
            dto.setEventName(e.getSummary());
            dto.setDescription(e.getDescription());

            String startDate = e.getStart().getDateTime().toString().substring(0, 10);
            dto.setStartDate(startDate);
            String startTime = e.getStart().getDateTime().toString().substring(11, 16);
            dto.setStartTime(startTime);
            String id = e.getId();
            dto.setEventId(id);

            reminders.add(dto);
        }

        return reminders;
    }



    public ResponseEntity<?> submitEvents(EventDto eventDto, HttpSession session) throws IOException {

        GoogleCredential credential = new GoogleCredential().setAccessToken((String) session.getAttribute("accessToken"));

        Calendar calendar = new Calendar.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance(),credential)
                .setApplicationName("ReMind")
                .build();

        Event event = new Event();
        event.setSummary(eventDto.getEventName());
        if(eventDto.getDescription() != null){
            event.setDescription(eventDto.getDescription());
        }

        String startDateTime = eventDto.getStartDate()+"T"+eventDto.getStartTime()+":00+05:30";

        EventDateTime eventStart = new EventDateTime()
                .setDateTime(new DateTime(startDateTime))
                .setTimeZone("Asia/Kolkata");

        event.setStart(eventStart);
        event.setEnd(eventStart);

        Event.Reminders reminders = new Event.Reminders()
                .setUseDefault(false)
                .setOverrides(List.of(
                  new EventReminder().setMethod("popup").setMinutes(eventDto.getReminderTime()*24*60),
                  new EventReminder().setMethod("email").setMinutes(eventDto.getReminderTime()*24*60)
                ));
        event.setReminders(reminders);
        if(eventDto.getEmails()!= null && !eventDto.getEmails().isEmpty() ){
        List<EventAttendee> eventAttendee = new ArrayList<>();
        for(String attendeeEmail : eventDto.getEmails()){
            eventAttendee.add(new EventAttendee().setEmail(attendeeEmail));
        }

        event.setAttendees(eventAttendee);
        }

        Event createdEvent = calendar.events()
                .insert("primary",event)
                .setSendUpdates("all")
                .execute();

        return ResponseEntity.ok(Map.of("success", true, "htmlLink", createdEvent.getHtmlLink()));
    }

    public String deleteEvents(String eventId, HttpSession session) throws IOException {
        GoogleCredential credential = new GoogleCredential().setAccessToken((String) session.getAttribute("accessToken"));

        Calendar calendar = new Calendar.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance(), credential)
                .setApplicationName("ReMind")
                .build();

        calendar.events().delete("primary",eventId).execute();


        return "ok";
    }


}
