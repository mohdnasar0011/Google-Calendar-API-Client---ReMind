package com.app.reMind.service;
import com.app.reMind.dto.AuthCodeDto;
import com.app.reMind.dto.UserDto;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import jakarta.servlet.http.HttpSession;
import org.apache.catalina.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service

public class AuthCodeToAccessAndRefreshTokenService {


    @Value("${google.client.id}")
    private String clientId;

    @Value("${google.client.secret}")
    private String clientSecret;

    @Value("${google.redirect.uri}")
    private String redirectUri;

    public GoogleTokenResponse getAccessToken(AuthCodeDto code) throws IOException {
            String AuthCode = code.getCode();
        return new GoogleAuthorizationCodeTokenRequest(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance(),
                "https://oauth2.googleapis.com/token",
                clientId,
                clientSecret,
                AuthCode,
                redirectUri

        ).execute();
    }

    public ResponseEntity<?> getUserName(HttpSession session){
        String name = session.getAttribute("name").toString();
        String email = session.getAttribute("email").toString();


         return ResponseEntity.ok(new UserDto(name, email));
    }
}


