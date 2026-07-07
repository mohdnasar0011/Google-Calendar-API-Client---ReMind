package com.app.reMind.controller;

import com.app.reMind.dto.AlreadyCreatedReminderDto;
import com.app.reMind.dto.AuthCodeDto;
import com.app.reMind.dto.EventDto;
import com.app.reMind.service.AuthCodeToAccessAndRefreshTokenService;
import com.app.reMind.service.CalenderClientService;

import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.services.calendar.model.Event;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api")
public class AuthCodeController {

    @Autowired
    AuthCodeToAccessAndRefreshTokenService authCodeToAccessAndRefreshTokenService;

    @Autowired
    CalenderClientService calenderClientService;



    @PostMapping("create-tokens")
    public String getAuthCode(@RequestBody AuthCodeDto authCode,HttpSession session) throws IOException {

        GoogleTokenResponse tokens =  authCodeToAccessAndRefreshTokenService.getAccessToken(authCode);



        String accessToken = tokens.getAccessToken();
        String email = tokens.parseIdToken().getPayload().getEmail();
        Long expiryTime = tokens.getExpiresInSeconds();
        String name = tokens.parseIdToken().getPayload().get("name").toString();

        session.setAttribute("accessToken",accessToken);
        session.setAttribute("email",email);
        session.setAttribute("expiryTime",expiryTime);
        session.setAttribute("name",name);
        session.setAttribute("email",email);



        return calenderClientService.apiSetup(session);
    }

    @PostMapping("events")
    public ResponseEntity<?> submitEvents(@RequestBody EventDto eventDto,HttpSession session) throws IOException {

        return calenderClientService.submitEvents(eventDto,session);
    }

    @GetMapping("events")
    public List<AlreadyCreatedReminderDto> reminders(HttpSession session) throws IOException{
        return calenderClientService.existingEvents(session);
    }


    @GetMapping("/warmup")
    public ResponseEntity<String> warmup() {
        return ResponseEntity.ok("Backend is awake!");


    }

    @GetMapping("user")
    public ResponseEntity<?> getUserName( HttpSession session) {

        return authCodeToAccessAndRefreshTokenService.getUserName(session);
    }

    @DeleteMapping("events/{eventId}")
    public String deleteEvent(@PathVariable String eventId, HttpSession session) throws IOException{

        return calenderClientService.deleteEvents(eventId,session);
    }
}



