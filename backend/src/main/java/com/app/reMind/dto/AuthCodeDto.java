package com.app.reMind.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data

public class AuthCodeDto {

    private String code;
}
