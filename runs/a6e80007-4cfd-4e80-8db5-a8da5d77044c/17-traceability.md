# Traceability — bbps/ccbp

Run: `a6e80007-4cfd-4e80-8db5-a8da5d77044c`

| Manual TC | Rule ID | Assert fn | Spec step | API |
|-----------|---------|-----------|-----------|-----|
| TC-39 | TC-39_1_user_can_start_the_journey_without_already_havin_na | non_automatable | step-1 | ccbp.customer_profile |
| TC-39 | TC-39_2_login_succeeds_session_is_established_1 | expect.equals | step-2 | ccbp.customer_profile |
| TC-39 | TC-39_3_update_is_accepted_user_can_proceed_no_blocking__2 | assertUpdateCustomerDetailsAccepted | step-3 | ccbp.customer_profile |
| TC-39 | TC-39_4_bbps_credit_card_entry_is_available_user_lands_o_na | non_automatable | order-2 | ccbp.customer_profile |
| TC-39 | TC-39_5_no_saved_cards_yet_empty_list_0_total_due_stashg_4 | expect.length.zero | step-5 | ccbp.customer_profile |
| TC-39 | TC-39_5_no_saved_cards_yet_empty_list_0_total_due_stashg_5 | expect.equals | step-5 | ccbp.customer_profile |
| TC-39 | TC-39_5_no_saved_cards_yet_empty_list_0_total_due_stashg_6 | expect.equals | step-5 | ccbp.customer_profile |
| TC-39 | TC-39_5_no_saved_cards_yet_empty_list_0_total_due_stashg_7 | expect.equals | step-5 | ccbp.customer_profile |
| TC-39 | TC-39_6_screen_loads_successfully_but_no_bureau_sourced__8 | expect.length.zero | step-6 | ccbp.customer_profile |
| TC-39 | TC-39_7_profile_shows_a_real_user_name_email_mobile_new__9 | expect.gt | step-7 | ccbp.customer_profile |
| TC-39 | TC-39_7_profile_shows_a_real_user_name_email_mobile_new__10 | expect.present | step-7 | ccbp.customer_profile |
| TC-39 | TC-39_7_profile_shows_a_real_user_name_email_mobile_new__11 | expect.present | step-7 | ccbp.customer_profile |
| TC-39 | TC-39_7_profile_shows_a_real_user_name_email_mobile_new__12 | expect.equals | step-7 | ccbp.customer_profile |
| TC-39 | TC-39_8_list_of_providers_is_not_empty_user_can_pick_a_b_13 | expect.length.gt | order-5 | ccbp.home_page |
| TC-39 | TC-39_9_variants_screen_shows_popular_and_other_options__14 | expect.length.gt | order-7 | ccbp.variants |
| TC-39 | TC-39_9_variants_screen_shows_popular_and_other_options__15 | expect.networks.contains | order-7 | ccbp.variants |
| TC-39 | TC-39_10_details_match_the_chosen_biller_fields_required__16 | expect.present | step-10 | ccbp.customer_profile |
| TC-39 | TC-39_11_bill_is_found_due_amount_and_status_look_valid_u_17 | assertCcbpNewUserJourneyContracts | order-8 | ccbp.provider_details |
| TC-39 | TC-39_12_at_least_one_credit_card_bill_appears_for_this_u_18 | expect.length.gte | step-12 | ccbp.customer_profile |
