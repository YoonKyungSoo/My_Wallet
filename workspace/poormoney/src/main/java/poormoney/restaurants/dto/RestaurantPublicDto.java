package poormoney.restaurants.dto;

import java.util.List;

public record RestaurantPublicDto(
    long id,
    String approvedId,
    String name,
    String category,
    Double rating,
    String address,
    Integer recommendCount,
    Integer reviewCount,
    List<Integer> menuPrices,
    List<String> photos,
    String phone,
    String menuName,
    String menuPriceLabel) {}

